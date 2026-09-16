-- Entity Document CRM — Storage setup
-- Run this in the Supabase SQL editor AFTER schema.sql.
-- Creates the "documents" bucket and RLS policies for it.
--
-- File path convention used by the app: {entity_id}/{table}/{filename}
-- e.g. 3fa2.../licenses/liquor-license.pdf
-- The first path segment (entity_id) is what the policies below check
-- against user_entity_access, mirroring the table RLS in schema.sql.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Read: admins see everything, everyone else only files under entities
-- they've been granted access to.
create policy "documents_select" on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      is_admin()
      or (storage.foldername(name))[1]::uuid in (
        select entity_id from user_entity_access where user_id = auth.uid()
      )
    )
  );

-- Write (upload/replace/delete): admins everywhere; editors only under
-- entities they've been granted access to — matching the "*_write" table
-- policies in schema.sql.
create policy "documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (
      is_admin()
      or (is_editor() and has_entity_access((storage.foldername(name))[1]::uuid))
    )
  );

create policy "documents_update" on storage.objects for update
  using (
    bucket_id = 'documents'
    and (
      is_admin()
      or (is_editor() and has_entity_access((storage.foldername(name))[1]::uuid))
    )
  );

create policy "documents_delete" on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (
      is_admin()
      or (is_editor() and has_entity_access((storage.foldername(name))[1]::uuid))
    )
  );
