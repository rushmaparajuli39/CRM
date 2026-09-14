# Entity Document CRM — Project Spec

## Goal
Internal web app to manage documents (EIN, licenses, insurance) for 20 business
entities (vape shops, insurance operations, parlors), with department-level
confidential access — free to run.

## Stack
- **Frontend**: Next.js (React) — deployed free on Vercel
- **Backend/DB**: Supabase (free tier) — Postgres + Auth + File Storage
- **Auth**: Supabase Auth (email/password login per staff member)
- **File storage**: Supabase Storage buckets (photos/PDFs of licenses, EIN
  letters, insurance certs)
- **Security**: Postgres Row Level Security (RLS) — access enforced at the
  database level, not just hidden in the UI

## Core features (v1)
1. Login (Supabase Auth)
2. Entity list — dashboard of all 20 businesses, filtered to what the logged-in
   user is allowed to see
3. Entity detail page — EIN info, licenses, insurance, with document
   photos/PDFs viewable and downloadable
4. Upload documents to an entity (photo or PDF)
   - Must work on mobile: staff should be able to snap a photo directly from
     their phone's camera and upload it on the spot (not just pick existing
     files). Use an HTML file input with `capture="environment"` so mobile
     browsers open the camera directly as an option — this needs no extra
     library, just correct input markup in the upload component.
5. Expiration tracking — flag licenses/insurance expiring within 30/60 days
6. Admin panel — assign which users can see which entities

## Access model
- Each staff account is granted access to specific entities (not by category —
  flexible, since department structure isn't finalized yet)
- Admins can see/manage everything and assign access
- Regular users only ever see entities they're explicitly granted

## Build order (recommended for Claude Code)
1. Set up Supabase project, run schema.sql (provided)
2. Scaffold Next.js app, connect Supabase client
3. Build auth/login flow
4. Build entity list + detail views
5. Build document upload (Supabase Storage)
6. Build admin access-assignment panel
7. Add expiration alerts/dashboard
8. Deploy to Vercel (free tier)

## Notes for whoever picks this up in Claude Code
- Free tier limits: Supabase free = 500MB database + 1GB file storage + 50k
  monthly active users — plenty for this use case; revisit if photo volume
  grows large
- Keep entity type (vape shop / insurance ops / parlor) as a field, not a
  separate schema — so document types can be filtered/labeled by type without
  restructuring
