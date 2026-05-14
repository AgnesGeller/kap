create extension if not exists pg_trgm with schema extensions;

create index if not exists clients_company_name_idx
on public.clients (company_id, name);

create index if not exists clients_company_active_name_idx
on public.clients (company_id, is_active, name);

create index if not exists clients_name_trgm_idx
on public.clients using gin (name gin_trgm_ops);

create index if not exists clients_project_address_trgm_idx
on public.clients using gin (project_address gin_trgm_ops);

create index if not exists work_logs_company_date_desc_idx
on public.work_logs (company_id, work_date desc);

create index if not exists work_logs_company_status_date_idx
on public.work_logs (company_id, status, work_date desc);

create index if not exists work_logs_customer_name_trgm_idx
on public.work_logs using gin (customer_name gin_trgm_ops);

create index if not exists work_logs_task_summary_trgm_idx
on public.work_logs using gin (task_summary gin_trgm_ops);

create index if not exists work_log_items_company_name_idx
on public.work_log_items (company_id, name);

create index if not exists work_log_items_name_trgm_idx
on public.work_log_items using gin (name gin_trgm_ops);

create index if not exists income_entries_company_date_desc_idx
on public.income_entries (company_id, income_date desc);

create index if not exists income_entries_company_status_date_idx
on public.income_entries (company_id, status, income_date desc);

create index if not exists income_entries_company_payment_date_idx
on public.income_entries (company_id, payment_method, income_date desc);

create index if not exists income_entries_customer_name_trgm_idx
on public.income_entries using gin (customer_name gin_trgm_ops);

create index if not exists income_entries_site_address_trgm_idx
on public.income_entries using gin (site_address gin_trgm_ops);

create index if not exists income_entries_invoice_number_trgm_idx
on public.income_entries using gin (invoice_number gin_trgm_ops);

create index if not exists expense_entries_company_date_desc_idx
on public.expense_entries (company_id, expense_date desc);

create index if not exists expense_entries_company_type_date_idx
on public.expense_entries (company_id, expense_type, expense_date desc);

create index if not exists expense_entries_company_payment_date_idx
on public.expense_entries (company_id, payment_method, expense_date desc);

create index if not exists expense_entries_vendor_name_trgm_idx
on public.expense_entries using gin (vendor_name gin_trgm_ops);

create index if not exists expense_entries_item_name_trgm_idx
on public.expense_entries using gin (item_name gin_trgm_ops);

create index if not exists expense_entries_invoice_number_trgm_idx
on public.expense_entries using gin (invoice_number gin_trgm_ops);

create index if not exists employee_payroll_company_date_desc_idx
on public.employee_payroll_entries (company_id, payroll_date desc);

create index if not exists employee_payroll_company_employee_date_idx
on public.employee_payroll_entries (company_id, employee_id, payroll_date desc);

create index if not exists employees_company_status_name_idx
on public.employees (company_id, status, name);

create index if not exists employees_name_trgm_idx
on public.employees using gin (name gin_trgm_ops);

create index if not exists price_items_company_status_name_idx
on public.price_items (company_id, status, name);

create index if not exists price_items_name_trgm_idx
on public.price_items using gin (name gin_trgm_ops);
