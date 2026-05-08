grant usage on schema public to authenticated;

grant select on public.companies to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.site_surveys to authenticated;

drop policy if exists "companies_select_same_company" on public.companies;
create policy "companies_select_same_company"
on public.companies
for select
to authenticated
using (
  id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "clients_select_same_company" on public.clients;
create policy "clients_select_same_company"
on public.clients
for select
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "clients_insert_same_company" on public.clients;
create policy "clients_insert_same_company"
on public.clients
for insert
to authenticated
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "clients_update_same_company" on public.clients;
create policy "clients_update_same_company"
on public.clients
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

drop policy if exists "clients_delete_same_company" on public.clients;
create policy "clients_delete_same_company"
on public.clients
for delete
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "site_surveys_select_same_company" on public.site_surveys;
create policy "site_surveys_select_same_company"
on public.site_surveys
for select
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "site_surveys_insert_same_company" on public.site_surveys;
create policy "site_surveys_insert_same_company"
on public.site_surveys
for insert
to authenticated
with check (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

drop policy if exists "site_surveys_update_same_company" on public.site_surveys;
create policy "site_surveys_update_same_company"
on public.site_surveys
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

drop policy if exists "site_surveys_delete_same_company" on public.site_surveys;
create policy "site_surveys_delete_same_company"
on public.site_surveys
for delete
to authenticated
using (
  company_id = (
    select p.company_id
    from public.profiles p
    where p.id = auth.uid()
  )
);
