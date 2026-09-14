# Entity Document CRM

Internal tool for tracking EIN records, licenses, and insurance policies
(with document photos/PDFs) across 20 business entities, with per-entity
access control enforced at the database level via Postgres Row Level
Security.

Stack: Next.js (App Router) + Supabase (Postgres, Auth, Storage), free tier.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In the SQL Editor, run these three files from `supabase/` **in order**:
   1. `schema.sql` — tables, RLS policies
   2. `storage.sql` — the private `documents` storage bucket and its RLS
      policies
   3. `triggers.sql` — auto-creates a `profiles` row (defaulting to
      `viewer`) whenever someone signs up
3. In Project Settings → API, copy the Project URL, `anon` public key, and
   `service_role` key.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in the three values from step 1.3. `SUPABASE_SERVICE_ROLE_KEY` is
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

## Features

- **Login** — Supabase Auth (email/password).
- **Dashboard** — entities you have access to, plus an alert list of
  licenses/insurance policies expiring within 60 days (color-coded at the
  30-day mark).
- **Entity detail** — EIN records, licenses, and insurance policies, each
  with a document you can view (private storage, served via short-lived
  signed URLs) or upload.
- **Document upload** — the file input uses `capture="environment"`, so on
  a phone it offers the camera directly, not just the file picker.
- **Admin panel** — create entities, create staff logins, set roles, and
  grant/revoke per-entity access.

## Access model

- `profiles.role`: `admin` sees and manages everything. `viewer`/`editor`
  see only entities granted via `user_entity_access`.
- As shipped in `schema.sql`, only `admin` can write (insert/update/delete)
  to entities, EIN records, licenses, insurance policies, or upload
  documents — `editor` currently has read-only access, same as `viewer`.
  If you want editors to be able to upload/edit, extend the `*_write`
  policies in `schema.sql` (and `documents_insert`/`_update`/`_delete` in
  `storage.sql`) to also allow `role = 'editor'`.
- RLS is the actual enforcement — the UI hides admin-only controls from
  non-admins, but the database rejects the write either way.

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
