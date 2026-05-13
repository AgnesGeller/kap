do $$
begin
  if not exists (select 1 from pg_type where typname = 'work_log_status') then
    create type public.work_log_status as enum (
      'draft',
      'completed',
      'billed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'income_status') then
    create type public.income_status as enum (
      'draft',
      'unpaid',
      'partial',
      'paid',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum (
      'cash',
      'transfer',
      'card',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'expense_type') then
    create type public.expense_type as enum (
      'client',
      'operating',
      'investment',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'employee_status') then
    create type public.employee_status as enum (
      'active',
      'inactive',
      'archived'
    );
  end if;
end;
$$;

alter table public.clients
  add column if not exists client_type text,
  add column if not exists contact_name text,
  add column if not exists tax_number text,
  add column if not exists regular_work text,
  add column if not exists is_flat_rate boolean not null default false,
  add column if not exists is_monthly_billing boolean not null default false,
  add column if not exists invoice_owner text,
  add column if not exists customer_since date,
  add column if not exists custom_pricing_note text,
  add column if not exists is_active boolean not null default true;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role_title text,
  phone text,
  email text,
  daily_rate numeric(12,2) not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  overtime_rate numeric(12,2) not null default 5000,
  status public.employee_status not null default 'active',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  work_date date not null default current_date,
  month smallint generated always as (extract(month from work_date)::smallint) stored,
  customer_name text not null,
  site_address text,
  task_summary text not null,
  status public.work_log_status not null default 'draft',
  crew_count integer not null default 1,
  started_at time,
  finished_at time,
  work_hours numeric(8,2) not null default 0,
  hourly_rate numeric(12,2) not null default 8000,
  labor_total numeric(12,2) not null default 0,
  material_total numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  is_flat_rate boolean not null default false,
  billing_note text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.work_log_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  work_log_id uuid not null references public.work_logs(id) on delete cascade,
  category text not null default 'munka',
  name text not null,
  quantity numeric(12,2) not null default 0,
  unit text not null default 'db',
  unit_price numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  work_log_id uuid references public.work_logs(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  income_date date not null default current_date,
  month smallint generated always as (extract(month from income_date)::smallint) stored,
  customer_name text not null,
  site_address text,
  description text,
  calculated_amount numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  status public.income_status not null default 'unpaid',
  payment_method public.payment_method,
  invoice_number text,
  invoice_owner text,
  is_flat_rate boolean not null default false,
  is_vat_invoice boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  expense_date date not null default current_date,
  month smallint generated always as (extract(month from expense_date)::smallint) stored,
  vendor_name text not null,
  item_name text not null,
  gross_amount numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 27,
  vat_amount numeric(12,2) not null default 0,
  expense_type public.expense_type not null default 'operating',
  payment_method public.payment_method,
  is_reconciled boolean not null default false,
  invoice_number text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_date date not null default current_date,
  month smallint generated always as (extract(month from payroll_date)::smallint) stored,
  normal_days numeric(8,2) not null default 0,
  normal_hours numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  daily_rate numeric(12,2) not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  overtime_rate numeric(12,2) not null default 5000,
  bonus_amount numeric(12,2) not null default 0,
  advance_amount numeric(12,2) not null default 0,
  loan_repayment_amount numeric(12,2) not null default 0,
  custom_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists employees_company_id_idx on public.employees (company_id);
create index if not exists employees_status_idx on public.employees (status);
create index if not exists work_logs_company_id_idx on public.work_logs (company_id);
create index if not exists work_logs_work_date_idx on public.work_logs (work_date);
create index if not exists work_logs_client_id_idx on public.work_logs (client_id);
create index if not exists work_log_items_work_log_id_idx on public.work_log_items (work_log_id);
create index if not exists income_entries_company_id_idx on public.income_entries (company_id);
create index if not exists income_entries_income_date_idx on public.income_entries (income_date);
create index if not exists income_entries_status_idx on public.income_entries (status);
create index if not exists expense_entries_company_id_idx on public.expense_entries (company_id);
create index if not exists expense_entries_expense_date_idx on public.expense_entries (expense_date);
create index if not exists employee_payroll_entries_company_id_idx on public.employee_payroll_entries (company_id);
create index if not exists employee_payroll_entries_employee_id_idx on public.employee_payroll_entries (employee_id);

alter table public.employees enable row level security;
alter table public.work_logs enable row level security;
alter table public.work_log_items enable row level security;
alter table public.income_entries enable row level security;
alter table public.expense_entries enable row level security;
alter table public.employee_payroll_entries enable row level security;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

drop trigger if exists work_logs_set_updated_at on public.work_logs;
create trigger work_logs_set_updated_at
before update on public.work_logs
for each row
execute function public.set_updated_at();

drop trigger if exists income_entries_set_updated_at on public.income_entries;
create trigger income_entries_set_updated_at
before update on public.income_entries
for each row
execute function public.set_updated_at();

drop trigger if exists expense_entries_set_updated_at on public.expense_entries;
create trigger expense_entries_set_updated_at
before update on public.expense_entries
for each row
execute function public.set_updated_at();

drop trigger if exists employee_payroll_entries_set_updated_at on public.employee_payroll_entries;
create trigger employee_payroll_entries_set_updated_at
before update on public.employee_payroll_entries
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.work_logs to authenticated;
grant select, insert, update, delete on public.work_log_items to authenticated;
grant select, insert, update, delete on public.income_entries to authenticated;
grant select, insert, update, delete on public.expense_entries to authenticated;
grant select, insert, update, delete on public.employee_payroll_entries to authenticated;

drop policy if exists "employees_same_company_all" on public.employees;
create policy "employees_same_company_all"
on public.employees
for all
to authenticated
using (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
with check (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "work_logs_same_company_all" on public.work_logs;
create policy "work_logs_same_company_all"
on public.work_logs
for all
to authenticated
using (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
with check (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "work_log_items_same_company_all" on public.work_log_items;
create policy "work_log_items_same_company_all"
on public.work_log_items
for all
to authenticated
using (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
with check (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "income_entries_same_company_all" on public.income_entries;
create policy "income_entries_same_company_all"
on public.income_entries
for all
to authenticated
using (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
with check (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "expense_entries_same_company_all" on public.expense_entries;
create policy "expense_entries_same_company_all"
on public.expense_entries
for all
to authenticated
using (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
with check (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "employee_payroll_entries_same_company_all" on public.employee_payroll_entries;
create policy "employee_payroll_entries_same_company_all"
on public.employee_payroll_entries
for all
to authenticated
using (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
with check (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));
