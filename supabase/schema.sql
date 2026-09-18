-- Entity Document CRM — Supabase schema
-- Run this in the Supabase SQL editor after creating your project.

-- ========== TABLES ==========

create table entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null, -- free text, admin's own label — no fixed category list
  address text,
  status text not null default 'active' check (status in ('active','closed')),
  notes text,
  created_at timestamptz default now()
);

create table ein_records (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  ein_number text not null,
  legal_name text,
  document_url text, -- path in Supabase Storage
  issued_date date,
  created_at timestamptz default now()
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  license_type text not null,
  license_number text,
  issuing_authority text,
  issue_date date,
  expiration_date date,
  status text default 'active',
  document_url text,
  created_at timestamptz default now()
);

create table insurance_policies (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  policy_type text not null,
  carrier text,
  policy_number text,
  coverage_amount numeric,
  effective_date date,
  expiration_date date,
  document_url text,
  created_at timestamptz default now()
);

-- Extends Supabase's built-in auth.users with app-level role info
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz default now()
);

-- Grants a user access to a specific entity
create table user_entity_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  primary key (user_id, entity_id)
);

-- ========== ROW LEVEL SECURITY ==========

alter table entities enable row level security;
alter table ein_records enable row level security;
alter table licenses enable row level security;
alter table insurance_policies enable row level security;
alter table profiles enable row level security;
alter table user_entity_access enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Helper: is the current user an editor? (Editors can add/edit/delete
-- records on entities they've been granted access to; viewers cannot.)
create or replace function is_editor() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'editor'
  );
$$ language sql security definer;

-- Helper: does the current user have an access grant for this entity?
create or replace function has_entity_access(target_entity_id uuid) returns boolean as $$
  select exists (
    select 1 from user_entity_access
    where user_id = auth.uid() and entity_id = target_entity_id
  );
$$ language sql security definer;

-- Entities: admins see all, others see only granted entities
create policy "entities_select" on entities for select
  using (
    is_admin()
    or id in (select entity_id from user_entity_access where user_id = auth.uid())
  );

-- Same pattern for child tables (via entity_id)
create policy "ein_select" on ein_records for select
  using (
    is_admin()
    or entity_id in (select entity_id from user_entity_access where user_id = auth.uid())
  );

create policy "licenses_select" on licenses for select
  using (
    is_admin()
    or entity_id in (select entity_id from user_entity_access where user_id = auth.uid())
  );

create policy "insurance_select" on insurance_policies for select
  using (
    is_admin()
    or entity_id in (select entity_id from user_entity_access where user_id = auth.uid())
  );

-- Entities themselves (creating/renaming/closing a business) are a
-- structural decision — admin-only, same as access grants below.
create policy "entities_write" on entities for all
  using (is_admin()) with check (is_admin());

-- Records: admins write everywhere; editors write only on entities
-- they've been granted access to; viewers can't write at all.
create policy "ein_write" on ein_records for all
  using (is_admin() or (is_editor() and has_entity_access(entity_id)))
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

create policy "licenses_write" on licenses for all
  using (is_admin() or (is_editor() and has_entity_access(entity_id)))
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

create policy "insurance_write" on insurance_policies for all
  using (is_admin() or (is_editor() and has_entity_access(entity_id)))
  with check (is_admin() or (is_editor() and has_entity_access(entity_id)));

-- Profiles: users can see their own profile; admins see all
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or is_admin());

-- Only admins change roles (self-service role changes would be a
-- privilege-escalation hole). Insert is handled by the new-user trigger
-- in triggers.sql, which runs as security definer and bypasses RLS.
create policy "profiles_write" on profiles for update
  using (is_admin()) with check (is_admin());

-- Access grants: only admins manage these
create policy "access_select" on user_entity_access for select
  using (user_id = auth.uid() or is_admin());

create policy "access_write" on user_entity_access for all
  using (is_admin()) with check (is_admin());
