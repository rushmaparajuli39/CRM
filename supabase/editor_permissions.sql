-- Entity Document CRM — editor role permissions (patch)
--
-- Brings an ALREADY-APPLIED database up to date with the corrected
-- schema.sql/storage.sql: adds the 'editor' role's write access and fixes
-- a real bug where no one — not even admins — could change a user's role,
-- because `profiles` had a select policy but no update policy at all.
--
-- Safe to run any number of times (every statement replaces or
-- drop-then-recreates). If you're setting this project up fresh, skip
-- this file — schema.sql and storage.sql already include everything here.

-- ========== HELPERS ==========

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

-- ========== RECORD WRITE POLICIES (admin + editor-with-access) ==========

drop policy if exists "ein_write" on ein_records;
create policy "ein_write" on ein_records for all
  using (is_admin() or (is_editor() and has_entity_access(entity_id)))
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

drop policy if exists "licenses_write" on licenses;
create policy "licenses_write" on licenses for all
  using (is_admin() or (is_editor() and has_entity_access(entity_id)))
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

drop policy if exists "insurance_write" on insurance_policies;
create policy "insurance_write" on insurance_policies for all
  using (is_admin() or (is_editor() and has_entity_access(entity_id)))
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

-- ========== PROFILES (fixes the missing update policy) ==========

drop policy if exists "profiles_write" on profiles;
create policy "profiles_write" on profiles for update
  using (is_admin()) with check (is_admin());

-- ========== STORAGE WRITE POLICIES (admin + editor-with-access) ==========

drop policy if exists "documents_insert" on storage.objects;
create policy "documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (
      is_admin()
      or (is_editor() and has_entity_access((storage.foldername(name))[1]::uuid))
    )
  );

drop policy if exists "documents_update" on storage.objects;
create policy "documents_update" on storage.objects for update
  using (
    bucket_id = 'documents'
    and (
      is_admin()
      or (is_editor() and has_entity_access((storage.foldername(name))[1]::uuid))
    )
  );

drop policy if exists "documents_delete" on storage.objects;
create policy "documents_delete" on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (
      is_admin()
      or (is_editor() and has_entity_access((storage.foldername(name))[1]::uuid))
    )
  );

-- Migration tracking — see schema.sql for the full explanation.
create table if not exists _migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
insert into _migrations (id) values ('editor_permissions.sql') on conflict (id) do nothing;
