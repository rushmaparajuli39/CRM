-- Entity Document CRM — Audit log
-- Run this in the Supabase SQL editor after schema.sql (this depends on
-- is_admin(), is_editor(), and has_entity_access() defined there).
--
-- Every insert/update/delete on entities, ein_records, licenses, and
-- insurance_policies is logged automatically by a trigger — there's no
-- "remember to log this" call anywhere in the app. changed_fields stores
-- a before/after pair per column that actually changed (all of NEW for
-- a create, all of OLD for a delete, only the touched columns for an
-- update) — e.g. {"expiration_date": {"before": "2026-01-01", "after":
-- "2027-01-01"}}.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  -- Deliberately no ON DELETE CASCADE here (or on entity_id below): a
  -- log entry must survive the user or entity it's about being deleted
  -- — that's the whole point of an audit trail surviving the deletion
  -- it's recording. SET NULL keeps the row; a NULL user_id in the UI
  -- reads as "user no longer exists", not a broken log entry.
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete')),
  table_name text not null,
  record_id uuid not null,
  -- No FK to entities(id), for the same reason as user_id above — this
  -- must keep recording an entity's deletion even as that row goes away
  -- in the same transaction (the trigger fires before the cascade
  -- completes, so entity_id is always valid at insert time regardless).
  entity_id uuid,
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_id_idx on audit_log (entity_id);
create index audit_log_created_at_idx on audit_log (created_at desc);

alter table audit_log enable row level security;

-- Read: admins see every entry; everyone else sees only entries for
-- entities they've been granted access to — the same scoping as the
-- underlying tables' own *_select policies.
create policy "audit_log_select" on audit_log for select
  using (is_admin() or has_entity_access(entity_id));

-- No insert/update/delete policy at all, for anyone. That's deliberate:
-- with RLS enabled, no policy means no row ever satisfies a write, so
-- there is no way to write here through the app or the API — not even
-- for an admin. The only path in is the trigger function below, which
-- runs `security definer` (owned by the migration role, which bypasses
-- RLS) so it can insert regardless.

create or replace function log_audit_event() returns trigger as $$
declare
  old_json jsonb := '{}'::jsonb;
  new_json jsonb := '{}'::jsonb;
  diff jsonb := '{}'::jsonb;
  col text;
  rec_id uuid;
  ent_id uuid;
  action_taken text;
begin
  if TG_OP = 'DELETE' then
    old_json := to_jsonb(OLD);
    rec_id := OLD.id;
    action_taken := 'delete';
  elsif TG_OP = 'INSERT' then
    new_json := to_jsonb(NEW);
    rec_id := NEW.id;
    action_taken := 'create';
  else
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    rec_id := NEW.id;
    action_taken := 'update';
  end if;

  -- entities is its own entity; every other logged table carries its
  -- own entity_id column.
  if TG_TABLE_NAME = 'entities' then
    ent_id := rec_id;
  elsif TG_OP = 'DELETE' then
    ent_id := OLD.entity_id;
  else
    ent_id := NEW.entity_id;
  end if;

  for col in select jsonb_object_keys(case when TG_OP = 'DELETE' then old_json else new_json end)
  loop
    if TG_OP = 'UPDATE' and old_json -> col is not distinct from new_json -> col then
      continue; -- unchanged column — skip it, only record what actually moved
    end if;
    diff := diff || jsonb_build_object(col, jsonb_build_object('before', old_json -> col, 'after', new_json -> col));
  end loop;

  insert into audit_log (user_id, action, table_name, record_id, entity_id, changed_fields)
  values (auth.uid(), action_taken, TG_TABLE_NAME, rec_id, ent_id, diff);

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

create trigger audit_entities
  after insert or update or delete on entities
  for each row execute function log_audit_event();

create trigger audit_ein_records
  after insert or update or delete on ein_records
  for each row execute function log_audit_event();

create trigger audit_licenses
  after insert or update or delete on licenses
  for each row execute function log_audit_event();

create trigger audit_insurance_policies
  after insert or update or delete on insurance_policies
  for each row execute function log_audit_event();

-- Migration tracking — see schema.sql for the full explanation.
create table if not exists _migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
insert into _migrations (id) values ('audit_log.sql') on conflict (id) do nothing;
