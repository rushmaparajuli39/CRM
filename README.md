# Entity Document CRM

Internal tool for tracking EIN records, licenses, and insurance policies
(with document photos/PDFs) across 20 business entities, with per-entity
access control enforced at the database level via Postgres Row Level
Security.

Stack: Next.js (App Router) + Supabase (Postgres, Auth, Storage), free tier.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In the SQL Editor, run these files from `supabase/` **in order**:
   1. `schema.sql` — tables, RLS policies
   2. `storage.sql` — the private `documents` storage bucket and its RLS
      policies
   3. `triggers.sql` — auto-creates a `profiles` row (defaulting to
      `viewer`) whenever someone signs up
   4. `audit_log.sql` — the `audit_log` table and the triggers that log
      every create/edit/delete on entities, EIN records, licenses, and
      insurance policies automatically
   5. `editor_permissions.sql` — only needed if you already applied an
      older copy of `schema.sql`/`storage.sql` before the editor-role
      write policies existed. On a fresh project this is redundant
      (schema.sql/storage.sql already include it) — skip it.
3. In Project Settings → API Keys, copy the Project URL, the
   **Publishable** key, and the **Secret** key — the "Publishable and
   secret API keys" tab, not "Legacy" (legacy anon/service_role JWT
   keys are disabled on this project).

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in the three values from step 1.3. `SUPABASE_SECRET_KEY` is
server-only (used by the Admin panel to create staff logins) — never
expose it to the browser.

## 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected
to `/login`.

## 4. Create your first admin

There's no public sign-up page (staff accounts are provisioned by an
admin) — so the very first admin has to be created directly in Supabase:

1. In the Supabase dashboard, go to Authentication → Users → Add user, and
   create yourself an account (email + password). This fires the trigger
   from `triggers.sql`, giving you a `profiles` row with `role = 'viewer'`.
2. In the SQL Editor, promote yourself:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Sign in at `/login`. You'll see the Admin tab — from there you can add
   entities, create logins for the rest of the staff, and grant them
   access to specific entities.

## 5. Enable password-reset emails

"Forgot your password?" on the login page, and the "Send reset link"
button next to each user in the Admin panel, both call Supabase's
`resetPasswordForEmail` — but Supabase will silently ignore the redirect
target unless it's on an allowlist:

1. Supabase dashboard → Authentication → URL Configuration → **Redirect
   URLs** → add `https://your-deployed-domain.com/reset-password` (and
   `http://localhost:3000/reset-password` too, if you want this to work
   locally).
2. That's it — no code change needed. The app builds the redirect URL
   itself at request time from the domain it's actually running on
   (`lib/site-url.ts`), so this is the only manual step.

Without this, clicking the emailed link redirects to Supabase's default
Site URL instead of the app's `/reset-password` page, and the reset
silently fails to reach the right place.

## Features

- **Login** — Supabase Auth (email/password), with self-service password
  reset (`/forgot-password` → emailed link → `/reset-password`) and an
  admin-triggered "Send reset link" per user in the Admin panel.
- **Dashboard** — entities you have access to, plus an alert list of
  licenses/insurance policies expiring within 60 days (color-coded at the
  30-day mark).
- **Entity detail** — EIN records, licenses, and insurance policies, each
  with a document you can view (private storage, served via short-lived
  signed URLs) or upload.
- **Document upload** — the file input uses `capture="environment"`, so on
  a phone it offers the camera directly, not just the file picker.
- **Admin panel** — create entities, create staff logins, set roles,
  grant/revoke per-entity access, and delete an entity (type-to-confirm,
  removes its records and documents too).
- **Audit log** (`/admin/audit-log`) — every create/edit/delete on
  entities, EIN records, licenses, and insurance policies, logged
  automatically by a database trigger rather than app code remembering
  to call something. Shows who, what, which entity, and when, newest
  first.

## Access model

Three roles in `profiles.role`:

| Role | Sees | Writes |
|---|---|---|
| `admin` | every entity | everything — entities, records, documents, staff access grants, roles |
| `editor` | only entities granted via `user_entity_access` | EIN records, licenses, insurance policies, and their documents — but only on entities they're granted, and never entities themselves or access grants |
| `viewer` | only entities granted via `user_entity_access` | nothing |

A couple of things worth being explicit about:

- **Entity creation and access grants are admin-only, deliberately.** Who
  can see which business, and whether a business exists at all, are
  structural decisions — an editor fixing a typo on a license shouldn't
  also be able to grant themselves access to a different entity.
- **RLS is the actual enforcement, not the UI.** The UI hides controls a
  role can't use, but every write is re-checked at the database via the
  `*_write` policies in `schema.sql` and `storage.sql` — an editor's
  request for an entity they're not granted is rejected there regardless
  of what the UI shows.
- **The audit log can't be written to directly, by anyone.** `audit_log`
  has a select policy but no insert/update/delete policy at all — the
  only way a row gets created is the trigger function in
  `audit_log.sql`, which runs as a security-definer function and so
  bypasses RLS. Reading it follows the same scoping as everything else:
  admins see every entry, everyone else only entries for entities
  they're granted.
- If you applied an older copy of this schema before editor write access
  existed, run `supabase/editor_permissions.sql` once to patch it in —
  see the setup steps above.

## Deploying

Push to GitHub and import the repo on [Vercel](https://vercel.com) (free
tier). Add the same three environment variables from `.env.local` in the
Vercel project settings, then deploy.

## Project structure

```
app/                      Next.js App Router pages
  login/                  Public login page
  (app)/                  Everything behind auth (layout enforces it)
    dashboard/            Entity list + expiration alerts
    entities/[id]/        Entity detail: records + document upload
    admin/                Entity/user management
lib/
  supabase/               Browser/server Supabase clients + middleware
  actions/                Server Actions (mutations)
  database.types.ts       Hand-written types matching schema.sql
components/                UI components
supabase/                  SQL to run in the Supabase SQL editor
proxy.ts                   Auth-aware middleware (session refresh + route guard)
```
