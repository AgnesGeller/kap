create table if not exists public.work_log_crew_segments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  work_log_id uuid not null references public.work_logs(id) on delete cascade,
  crew_name text not null default 'Csapat',
  crew_count numeric(8,2) not null default 1,
  started_at time not null,
  finished_at time not null,
  work_hours numeric(8,2) not null default 0,
  crew_hours numeric(10,2) not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  labor_total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists work_log_crew_segments_company_id_idx
  on public.work_log_crew_segments (company_id);

create index if not exists work_log_crew_segments_work_log_id_idx
  on public.work_log_crew_segments (work_log_id);

alter table public.work_log_crew_segments enable row level security;

grant select, insert, update, delete on public.work_log_crew_segments to authenticated;

drop policy if exists "work_log_crew_segments_same_company_all"
  on public.work_log_crew_segments;

create policy "work_log_crew_segments_same_company_all"
on public.work_log_crew_segments
for all
to authenticated
using (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
with check (company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));
