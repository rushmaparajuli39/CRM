-- Entity Document CRM — RLS helper functions (patch)
--
-- Recreates is_admin(), is_editor(), and has_entity_access() from
-- schema.sql. Nearly every RLS policy in this project calls one of
-- these — if any went missing (e.g. schema.sql was only partially run,
-- or a query got cut off mid-paste in the SQL editor), things fail in
-- confusing ways: writes silently rejected by RLS, or an outright
-- "function ... does not exist" error like:
--
--   ERROR: 42883: function has_entity_access(uuid) does not exist
--
-- All three are `create or replace function`, so this is safe to run
-- any number of times and won't touch your existing tables, data, or
-- policies. Requires profiles and user_entity_access to already exist
-- (from schema.sql) — this only recreates the functions themselves.

create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

create or replace function is_editor() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'editor'
  );
$$ language sql security definer;

create or replace function has_entity_access(target_entity_id uuid) returns boolean as $$
  select exists (
    select 1 from user_entity_access
    where user_id = auth.uid() and entity_id = target_entity_id
  );
$$ language sql security definer;
