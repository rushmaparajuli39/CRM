-- Entity Document CRM — Monthly cash sheets
-- Run this in the Supabase SQL editor after schema.sql, storage.sql, and
-- audit_log.sql (this depends on is_admin()/is_editor()/has_entity_access()
-- from schema.sql and log_audit_event() from audit_log.sql).
--
-- One row per entity per calendar month. `period` is always stored as the
-- 1st of that month (e.g. 2026-08-01 for August 2026), which is what the
-- unique constraint below enforces one-per-month on and what makes
-- "missing this month" a plain anti-join.
--
-- This is a manual-upload flow for now (an admin or editor picks a file),
-- but the table is shaped so an automated import job could fill it later
-- without a schema change: `source` distinguishes how a row got here, and
-- `uploaded_by` is nullable for exactly that case (an import job has no
-- staff user to attribute the row to).

create table monthly_cash_sheets (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  period date not null,
  document_url text, -- path in Supabase Storage
  source text not null default 'manual' check (source in ('manual', 'import')),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_id, period)
);

create index monthly_cash_sheets_period_idx on monthly_cash_sheets (period);

alter table monthly_cash_sheets enable row level security;

-- Read: same scoping as every other entity-scoped table — admins see
-- everything, everyone else only entities they've been granted.
create policy "cash_sheets_select" on monthly_cash_sheets for select
  using (is_admin() or has_entity_access(entity_id));

-- Insert: admins everywhere; editors only on entities they've been
-- granted — matching the "*_write" policies in schema.sql.
create policy "cash_sheets_insert" on monthly_cash_sheets for insert
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

-- Update: same as insert (e.g. re-pointing document_url), for the same
-- set of people who could have uploaded it in the first place.
create policy "cash_sheets_update" on monthly_cash_sheets for update
  using (is_admin() or (is_editor() and has_entity_access(entity_id)))
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

-- Delete: admin-only, deliberately narrower than insert/update. Editors
-- can add a cash sheet but can't remove one once it's in — same
-- reasoning as entities_write being admin-only for entity deletion.
create policy "cash_sheets_delete" on monthly_cash_sheets for delete
  using (is_admin());

create trigger audit_monthly_cash_sheets
  after insert or update or delete on monthly_cash_sheets
  for each row execute function log_audit_event();

-- Migration tracking — see schema.sql for the full explanation.
create table if not exists _migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
insert into _migrations (id) values ('monthly_cash_sheets.sql') on conflict (id) do nothing;
