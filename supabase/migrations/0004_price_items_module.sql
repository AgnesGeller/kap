do $$
begin
  if not exists (select 1 from pg_type where typname = 'price_item_status') then
    create type public.price_item_status as enum (
      'active',
      'inactive',
      'archived'
    );
  end if;
end;
$$;

create table if not exists public.price_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'db',
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 27,
  status public.price_item_status not null default 'active',
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists price_items_company_id_idx on public.price_items (company_id);
create index if not exists price_items_category_idx on public.price_items (category);
create index if not exists price_items_status_idx on public.price_items (status);

alter table public.price_items enable row level security;

drop trigger if exists price_items_set_updated_at on public.price_items;
create trigger price_items_set_updated_at
before update on public.price_items
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.price_items to authenticated;

drop policy if exists "price_items_select_same_company" on public.price_items;
create policy "price_items_select_same_company"
on public.price_items
for select
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "price_items_insert_same_company" on public.price_items;
create policy "price_items_insert_same_company"
on public.price_items
for insert
to authenticated
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "price_items_update_same_company" on public.price_items;
create policy "price_items_update_same_company"
on public.price_items
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

drop policy if exists "price_items_delete_same_company" on public.price_items;
create policy "price_items_delete_same_company"
on public.price_items
for delete
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);
