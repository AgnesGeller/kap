alter table public.work_logs
  alter column crew_count type numeric(8,2)
  using crew_count::numeric;

comment on column public.work_logs.crew_count is
  'Napi munkalap csapatlétszáma. Tizedes értéket is kezel.';
