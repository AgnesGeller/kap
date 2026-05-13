import Link from "next/link";

import {
  createEmployee,
  createExpenseEntry,
  createIncomeEntry,
  createWorkLog,
} from "@/app/app/mukodes/actions";
import { PayrollForm } from "@/app/app/mukodes/PayrollForm";
import { withTimeout } from "@/lib/async";
import { createQueryFallbackSuccess } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type WorkLogRow = {
  id: string;
  work_date: string;
  customer_name: string;
  task_summary: string;
  total_amount: number | null;
  status: string | null;
};

type IncomeRow = {
  id: string;
  income_date: string;
  customer_name: string;
  amount: number | null;
  status: string | null;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  vendor_name: string;
  item_name: string;
  gross_amount: number | null;
  expense_type: string | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  role_title: string | null;
  phone: string | null;
  daily_rate: number | null;
  hourly_rate: number | null;
  overtime_rate: number | null;
  status: string | null;
};

type PayrollRow = {
  id: string;
  payroll_date: string;
  total_amount: number | null;
  normal_days: number | null;
  normal_hours: number | null;
  overtime_hours: number | null;
  employees:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Nincs dátum";

  return new Intl.DateTimeFormat("hu-HU", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getPayrollEmployeeName(row: PayrollRow) {
  if (Array.isArray(row.employees)) {
    return row.employees[0]?.name ?? "Nincs dolgozó";
  }

  return row.employees?.name ?? "Nincs dolgozó";
}

function Field({
  id,
  label,
  name,
  placeholder,
  type = "text",
  defaultValue = "",
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  defaultValue?: string | number;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-[#2a211a]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

function TextArea({
  id,
  label,
  name,
  placeholder,
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-[#2a211a]">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  name,
  options,
}: {
  id: string;
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-[#2a211a]">
        {label}
      </label>
      <select
        id={id}
        name={name}
        className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [workLogsResult, incomeResult, expenseResult] = await Promise.all([
    withTimeout(
      supabase
        .from("work_logs")
        .select("id, work_date, customer_name, task_summary, total_amount, status")
        .order("work_date", { ascending: false })
        .limit(8),
      createQueryFallbackSuccess([]),
      6000,
    ),
    withTimeout(
      supabase
        .from("income_entries")
        .select("id, income_date, customer_name, amount, status")
        .order("income_date", { ascending: false })
        .limit(8),
      createQueryFallbackSuccess([]),
      6000,
    ),
    withTimeout(
      supabase
        .from("expense_entries")
        .select("id, expense_date, vendor_name, item_name, gross_amount, expense_type")
        .order("expense_date", { ascending: false })
        .limit(8),
      createQueryFallbackSuccess([]),
      6000,
    ),
  ]);
  const [employeesResult, payrollResult] = await Promise.all([
    withTimeout(
      supabase
        .from("employees")
        .select("id, name, role_title, phone, daily_rate, hourly_rate, overtime_rate, status")
        .order("name", { ascending: true })
        .limit(100),
      createQueryFallbackSuccess([]),
      6000,
    ),
    withTimeout(
      supabase
        .from("employee_payroll_entries")
        .select(
          "id, payroll_date, total_amount, normal_days, normal_hours, overtime_hours, employees(name)",
        )
        .order("payroll_date", { ascending: false })
        .limit(8),
      createQueryFallbackSuccess([]),
      6000,
    ),
  ]);

  const workLogs = (workLogsResult.data ?? []) as WorkLogRow[];
  const incomes = (incomeResult.data ?? []) as IncomeRow[];
  const expenses = (expenseResult.data ?? []) as ExpenseRow[];
  const employees = (employeesResult.data ?? []) as EmployeeRow[];
  const payrollRows = (payrollResult.data ?? []) as unknown as PayrollRow[];
  const payrollEmployeeOptions = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    dailyRate: employee.daily_rate ?? 0,
    hourlyRate: employee.hourly_rate ?? 0,
    overtimeRate: employee.overtime_rate ?? 5000,
  }));
  const setupError =
    workLogsResult.error?.message ??
    incomeResult.error?.message ??
    expenseResult.error?.message ??
    employeesResult.error?.message ??
    payrollResult.error?.message ??
    "";
  const incomeTotal = incomes.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const expenseTotal = expenses.reduce((sum, row) => sum + (row.gross_amount ?? 0), 0);
  const workLogTotal = workLogs.reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
  const payrollTotal = payrollRows.reduce((sum, row) => sum + (row.total_amount ?? 0), 0);

  return (
    <main className="flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Napi működés
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            Munkalap, bevétel és kiadás rögzítése
          </h1>
          <p className="mt-3 max-w-3xl text-base font-medium leading-8 text-[#44382e]">
            Ez a rész lesz a napi kertkarbantartási admin alapja. Röviden kell
            kitölteni, a rendszer pedig számolja a munkadíjat, bevételt és kiadást.
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza a központhoz
        </Link>
      </div>

      {params.message ? (
        <section className="rounded-[22px] border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold leading-7 text-emerald-950">
          {params.message}
        </section>
      ) : null}

      {params.error ? (
        <section className="rounded-[22px] border-2 border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold leading-7 text-rose-950">
          {params.error}
        </section>
      ) : null}

      {setupError ? (
        <section className="rounded-[22px] border-2 border-amber-300 bg-amber-50 px-5 py-4 text-base font-semibold leading-7 text-amber-950">
          A működési táblák még nem olvashatók a Supabase-ben. Ha ezt látod,
          valószínűleg a `0005_operations_finance_module.sql` migrációt kell
          lefuttatni. Hiba: {setupError}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Munkalap érték", workLogTotal, `${workLogs.length} friss munkalap`],
          ["Bevétel", incomeTotal, `${incomes.length} friss bevétel`],
          ["Kiadás", expenseTotal, `${expenses.length} friss kiadás`],
          ["Fizetések", payrollTotal, `${payrollRows.length} friss bérsor`],
        ].map(([label, value, note]) => (
          <article
            key={String(label)}
            className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]"
          >
            <p className="text-sm font-bold text-[#493b2f]">{label}</p>
            <p className="mt-3 break-words text-2xl font-bold text-[#17130f]">
              {formatMoney(Number(value))}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-[#5f5144]">
              {note}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <details className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <summary className="cursor-pointer list-none">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Dolgozók
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Dolgozó felvitele
            </h2>
          </summary>
          <form action={createEmployee} className="mt-5 grid gap-4 md:grid-cols-2">
            <Field id="employeeName" label="Név" name="name" placeholder="Dolgozó neve" />
            <Field id="roleTitle" label="Szerep" name="roleTitle" placeholder="Pl. kertész, segéd" />
            <Field id="employeePhone" label="Telefon" name="phone" placeholder="+36..." />
            <Field id="employeeDailyRate" label="Napi bér" name="dailyRate" type="number" placeholder="0" />
            <Field id="employeeHourlyRate" label="Órabér" name="hourlyRate" type="number" placeholder="0" />
            <Field id="employeeOvertimeRate" label="Túlóra díj" name="overtimeRate" type="number" placeholder="5000" defaultValue={5000} />
            <div className="md:col-span-2">
              <TextArea id="employeeNotes" label="Megjegyzés" name="notes" placeholder="Belső megjegyzés" />
            </div>
            <div className="md:col-span-2">
              <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
                Dolgozó mentése
              </button>
            </div>
          </form>
        </details>

        <details className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <summary className="cursor-pointer list-none">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Fizetések
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Bérköltség rögzítése
            </h2>
          </summary>
          <PayrollForm employees={payrollEmployeeOptions} today={today} />
        </details>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <details open className="rounded-[26px] border-2 border-[#1e5a40] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <summary className="cursor-pointer list-none">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Napi munkalap
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Elvégzett munka rögzítése
            </h2>
          </summary>
          <form action={createWorkLog} className="mt-5 grid gap-4">
            <Field id="workDate" label="Dátum" name="workDate" type="date" placeholder="" defaultValue={today} />
            <Field id="workCustomer" label="Ügyfél" name="customerName" placeholder="Ügyfél neve" />
            <Field id="workAddress" label="Helyszín" name="siteAddress" placeholder="Cím vagy terület" />
            <TextArea id="taskSummary" label="Elvégzett feladat" name="taskSummary" placeholder="Pl. fűnyírás, sövényvágás, zöldhulladék" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="crewCount" label="Fő" name="crewCount" type="number" placeholder="1" defaultValue={1} />
              <Field id="workHours" label="Óra" name="workHours" type="number" placeholder="0" />
              <Field id="hourlyRate" label="Óradíj" name="hourlyRate" type="number" placeholder="8000" defaultValue={8000} />
              <Field id="materialTotal" label="Anyag / egyéb" name="materialTotal" type="number" placeholder="0" />
            </div>
            <label className="flex items-center gap-3 rounded-[18px] bg-[#fff8ee] px-4 py-3 text-sm font-bold text-[#2a211a]">
              <input type="checkbox" name="isFlatRate" className="size-4" />
              Általányos ügyfélhez tartozik
            </label>
            <TextArea id="workNotes" label="Megjegyzés" name="notes" placeholder="Belső megjegyzés" />
            <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Munkalap mentése
            </button>
          </form>
        </details>

        <details className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <summary className="cursor-pointer list-none">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Bevétel
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Beérkező pénz rögzítése
            </h2>
          </summary>
          <form action={createIncomeEntry} className="mt-5 grid gap-4">
            <Field id="incomeDate" label="Dátum" name="incomeDate" type="date" placeholder="" defaultValue={today} />
            <Field id="incomeCustomer" label="Ügyfél" name="customerName" placeholder="Ügyfél neve" />
            <Field id="incomeAddress" label="Helyszín" name="siteAddress" placeholder="Cím vagy munka" />
            <Field id="incomeAmount" label="Összeg" name="amount" type="number" placeholder="0" />
            <SelectField
              id="incomeStatus"
              label="Állapot"
              name="status"
              options={[
                { value: "unpaid", label: "Nyitott" },
                { value: "paid", label: "Fizetve" },
                { value: "partial", label: "Részben fizetve" },
                { value: "draft", label: "Piszkozat" },
              ]}
            />
            <SelectField
              id="incomePayment"
              label="Fizetési mód"
              name="paymentMethod"
              options={[
                { value: "", label: "Nincs megadva" },
                { value: "cash", label: "Készpénz" },
                { value: "transfer", label: "Utalás" },
                { value: "card", label: "Kártya" },
                { value: "other", label: "Egyéb" },
              ]}
            />
            <Field id="invoiceNumber" label="Számla" name="invoiceNumber" placeholder="Számlaszám" />
            <TextArea id="incomeDescription" label="Leírás" name="description" placeholder="Mihez kapcsolódik a bevétel?" />
            <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Bevétel mentése
            </button>
          </form>
        </details>

        <details className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <summary className="cursor-pointer list-none">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Kiadás
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Költség rögzítése
            </h2>
          </summary>
          <form action={createExpenseEntry} className="mt-5 grid gap-4">
            <Field id="expenseDate" label="Dátum" name="expenseDate" type="date" placeholder="" defaultValue={today} />
            <Field id="vendorName" label="Szállító" name="vendorName" placeholder="Pl. Shell, Obi, kertészet" />
            <Field id="itemName" label="Tétel" name="itemName" placeholder="Pl. gázolaj, növény, eszköz" />
            <Field id="grossAmount" label="Bruttó összeg" name="grossAmount" type="number" placeholder="0" />
            <Field id="vatRate" label="ÁFA %" name="vatRate" type="number" placeholder="27" defaultValue={27} />
            <SelectField
              id="expenseType"
              label="Típus"
              name="expenseType"
              options={[
                { value: "operating", label: "Működési költség" },
                { value: "client", label: "Ügyfélhez kapcsolódó" },
                { value: "investment", label: "Beruházás" },
                { value: "other", label: "Egyéb" },
              ]}
            />
            <SelectField
              id="expensePayment"
              label="Fizetési mód"
              name="paymentMethod"
              options={[
                { value: "", label: "Nincs megadva" },
                { value: "cash", label: "Készpénz" },
                { value: "transfer", label: "Utalás" },
                { value: "card", label: "Kártya" },
                { value: "other", label: "Egyéb" },
              ]}
            />
            <Field id="expenseInvoiceNumber" label="Számla" name="invoiceNumber" placeholder="Számlaszám" />
            <TextArea id="expenseNotes" label="Megjegyzés" name="notes" placeholder="Belső megjegyzés" />
            <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Kiadás mentése
            </button>
          </form>
        </details>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <RecentList
          title="Friss munkalapok"
          empty="Még nincs rögzített munkalap."
          rows={workLogs.map((row) => ({
            id: row.id,
            title: row.customer_name,
            meta: `${formatDate(row.work_date)} · ${row.status ?? "nincs állapot"}`,
            value: formatMoney(row.total_amount),
            note: row.task_summary,
          }))}
        />
        <RecentList
          title="Friss bevételek"
          empty="Még nincs rögzített bevétel."
          rows={incomes.map((row) => ({
            id: row.id,
            title: row.customer_name,
            meta: `${formatDate(row.income_date)} · ${row.status ?? "nincs állapot"}`,
            value: formatMoney(row.amount),
          }))}
        />
        <RecentList
          title="Friss kiadások"
          empty="Még nincs rögzített kiadás."
          rows={expenses.map((row) => ({
            id: row.id,
            title: row.vendor_name,
            meta: `${formatDate(row.expense_date)} · ${row.expense_type ?? "nincs típus"}`,
            value: formatMoney(row.gross_amount),
            note: row.item_name,
          }))}
        />
        <RecentList
          title="Friss fizetések"
          empty="Még nincs rögzített fizetés."
          rows={payrollRows.map((row) => ({
            id: row.id,
            title: getPayrollEmployeeName(row),
            meta: `${formatDate(row.payroll_date)} · ${row.normal_days ?? 0} nap · ${row.normal_hours ?? 0} óra · ${row.overtime_hours ?? 0} túlóra`,
            value: formatMoney(row.total_amount),
          }))}
        />
      </section>
    </main>
  );
}

function RecentList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ id: string; title: string; meta: string; value: string; note?: string }>;
}) {
  return (
    <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
      <h2 className="text-2xl font-bold text-[#17130f]">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <article key={row.id} className="rounded-[18px] bg-[#fff8ee] px-4 py-4">
              <div className="flex flex-wrap justify-between gap-3">
                <p className="font-bold text-[#17130f]">{row.title}</p>
                <p className="font-bold text-[#1e5a40]">{row.value}</p>
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#674b25]">
                {row.meta}
              </p>
              {row.note ? (
                <p className="mt-2 text-sm font-medium leading-6 text-[#44382e]">
                  {row.note}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-[18px] bg-[#fff8ee] px-4 py-4 text-sm font-semibold leading-7 text-[#44382e]">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
