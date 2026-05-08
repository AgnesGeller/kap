create extension if not exists pgcrypto;

create type public.app_role as enum (
  'owner',
  'admin',
  'surveyor',
  'staff'
);

create type public.survey_status as enum (
  'draft',
  'submitted',
  'in_review',
  'quoted',
  'won',
  'lost',
  'archived'
);

create type public.survey_source as enum (
  'public_form',
  'internal'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  brand_name text,
  contact_email text,
  contact_phone text,
  primary_color text,
  accent_color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  billing_address text,
  project_address text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.site_surveys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text,
  status public.survey_status not null default 'draft',
  source public.survey_source not null default 'public_form',
  site_address text,
  postal_code text,
  settlement text,
  project_goal text,
  budget_tier text,
  service_keys text[] not null default '{}',
  form_payload jsonb not null default '{}'::jsonb,
  map_payload jsonb not null default '{}'::jsonb,
  estimated_total numeric(12,2) not null default 0,
  last_saved_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index clients_company_id_idx on public.clients (company_id);
create index site_surveys_company_id_idx on public.site_surveys (company_id);
create index site_surveys_client_id_idx on public.site_surveys (client_id);
create index site_surveys_created_by_idx on public.site_surveys (created_by);
create index site_surveys_status_idx on public.site_surveys (status);

create trigger companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

create trigger site_surveys_set_updated_at
before update on public.site_surveys
for each row
execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.site_surveys enable row level security;

create policy "companies_select_same_company"
on public.companies
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
  )
);

create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "clients_select_same_company"
on public.clients
for select
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "clients_insert_same_company"
on public.clients
for insert
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "clients_update_same_company"
on public.clients
for update
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
)
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "site_surveys_select_same_company"
on public.site_surveys
for select
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "site_surveys_insert_same_company"
on public.site_surveys
for insert
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy "site_surveys_update_same_company"
on public.site_surveys
for update
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
)
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);
