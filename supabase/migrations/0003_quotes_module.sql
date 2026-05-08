do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type public.quote_status as enum (
      'draft',
      'sent',
      'accepted',
      'rejected',
      'archived'
    );
  end if;
end;
$$;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  survey_id uuid references public.site_surveys(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  quote_number text,
  title text not null,
  status public.quote_status not null default 'draft',
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 27,
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists quotes_company_id_idx on public.quotes (company_id);
create index if not exists quotes_survey_id_idx on public.quotes (survey_id);
create index if not exists quotes_client_id_idx on public.quotes (client_id);
create index if not exists quotes_status_idx on public.quotes (status);

alter table public.quotes enable row level security;

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
before update on public.quotes
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.quotes to authenticated;

drop policy if exists "quotes_select_same_company" on public.quotes;
create policy "quotes_select_same_company"
on public.quotes
for select
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "quotes_insert_same_company" on public.quotes;
create policy "quotes_insert_same_company"
on public.quotes
for insert
to authenticated
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "quotes_update_same_company" on public.quotes;
create policy "quotes_update_same_company"
on public.quotes
for update
to authenticated
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

drop policy if exists "quotes_delete_same_company" on public.quotes;
create policy "quotes_delete_same_company"
on public.quotes
for delete
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);
