-- Manual Supabase SQL helper.
-- Run in Supabase SQL Editor when the auth users already exist.
-- It keeps the test account separated from live financial data.
-- It does not require casting to public.app_role, so it also works if the role column is plain text.

with test_company as (
  insert into public.companies (
    name,
    slug,
    brand_name,
    contact_email
  )
  values (
    'Teszt ceg',
    'teszt-ceg',
    'KAP Teszt',
    'teszt@teszt.com'
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    brand_name = excluded.brand_name,
    contact_email = excluded.contact_email,
    updated_at = timezone('utc', now())
  returning id
),
test_user as (
  select id
  from auth.users
  where lower(email) = 'teszt@teszt.com'
),
owner_user as (
  select id
  from auth.users
  where lower(email) = 'info@diszkertek.hu'
),
test_profile as (
  insert into public.profiles (
    id,
    company_id,
    full_name,
    role
  )
  select
    test_user.id,
    test_company.id,
    'Teszt felhasználó',
    'admin'
  from test_user
  cross join test_company
  on conflict (id) do update
  set
    company_id = excluded.company_id,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now())
  returning id
),
owner_profile as (
  insert into public.profiles (
    id,
    company_id,
    full_name,
    role
  )
  select
    owner_user.id,
    '02a3f0c8-9e8e-43a5-b8df-9511a10abe19'::uuid,
    'Díszkertek admin',
    'owner'
  from owner_user
  on conflict (id) do update
  set
    company_id = excluded.company_id,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now())
  returning id
),
test_company_id as (
  select id
  from public.companies
  where slug = 'teszt-ceg'
),
deleted_work_items as (
  delete from public.work_log_items
  where company_id in (select id from test_company_id)
  returning id
),
deleted_work_logs as (
  delete from public.work_logs
  where company_id in (select id from test_company_id)
  returning id
),
deleted_income as (
  delete from public.income_entries
  where company_id in (select id from test_company_id)
  returning id
),
deleted_expenses as (
  delete from public.expense_entries
  where company_id in (select id from test_company_id)
  returning id
),
deleted_payroll as (
  delete from public.employee_payroll_entries
  where company_id in (select id from test_company_id)
  returning id
),
deleted_employees as (
  delete from public.employees
  where company_id in (select id from test_company_id)
  returning id
),
deleted_clients as (
  delete from public.clients
  where company_id in (select id from test_company_id)
  returning id
)
select
  u.email,
  p.full_name,
  p.role,
  c.slug as company_slug,
  c.name as company_name
from auth.users u
left join public.profiles p on p.id = u.id
left join public.companies c on c.id = p.company_id
where lower(u.email) in ('teszt@teszt.com', 'info@diszkertek.hu')
order by u.email;
