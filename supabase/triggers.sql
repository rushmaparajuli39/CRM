-- Entity Document CRM — new-user bootstrap
-- Run this in the Supabase SQL editor AFTER schema.sql.
--
-- schema.sql's "profiles" table has no insert policy (by design — only
-- admins/the trigger below should create rows in it), so without this
-- trigger a freshly signed-up auth.users row would have no matching
-- profiles row and every RLS check that joins through profiles would fail
-- for them. This trigger runs as the table owner (security definer) and
-- creates the profile automatically, defaulting new users to 'viewer'.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'viewer');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- After running this, make your first admin by signing up through the app
-- once, then in the SQL editor:
--   update public.profiles set role = 'admin' where id =
--     (select id from auth.users where email = 'you@example.com');

-- Migration tracking — see schema.sql for the full explanation.
create table if not exists _migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
insert into _migrations (id) values ('triggers.sql') on conflict (id) do nothing;
