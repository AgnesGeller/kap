import Link from "next/link";
import { notFound } from "next/navigation";

import { budgetModules, type BudgetModuleKey } from "@/app/app/budgetModules";
import { ConfirmSubmitButton } from "@/app/app/mukodes/ConfirmSubmitButton";
import { ExpenseForm, IncomeForm } from "@/app/app/mukodes/FinanceForms";
import { PayrollForm, type PayrollEmployeeOption } from "@/app/app/mukodes/PayrollForm";
import {
  createEmployee,
  deleteExpenseEntry,
  deleteIncomeEntry,
  deletePayrollEntry,
  importWorkbookExpenses,
  importWorkbookIncomes,
  importWorkbookPayrollEntries,
  updateExpenseEntry,
  updateIncomeEntry,
  updatePayrollEntry,
} from "@/app/app/mukodes/actions";
import {
  formatMoney,
  formatNumber,
  getBudgetMonthlyRows,
  getClientStats,
  getModuleInsight,
  getModuleSummaryCards,
  getModuleTopGroups,
  getSheetTables,
  getTaskQuantityTotals,
  getWorkbookOverviewCards,
} from "@/lib/budget/analytics";
import {
  cleanWorkbookText,
  getWorkbookExpenseEntries,
  getWorkbookIncomeEntries,
  getWorkbookPayrollEntries,
} from "@/lib/budget/workbookData";
import { withTimeout } from "@/lib/async";
import { createQueryFallbackSuccess } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    module: string;
  }>;
  searchParams?: Promise<{
    q?: string;
    page?: string;
  }>;
};

type IncomeEntryRow = {
  id: string;
  income_date: string;
  customer_name: string;
  site_address: string | null;
  description: string | null;
  calculated_amount: number | null;
  amount: number | null;
  status: string | null;
  payment_method: string | null;
  invoice_number: string | null;
  is_vat_invoice: boolean | null;
  notes: string | null;
  isWorkbookOnly?: boolean;
};

type ExpenseEntryRow = {
  id: string;
  expense_date: string;
  vendor_name: string;
  item_name: string;
  gross_amount: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  expense_type: string | null;
  payment_method: string | null;
  invoice_number: string | null;
  notes: string | null;
  isWorkbookOnly?: boolean;
};

type EmployeeRow = {
  id: string;
  name: string;
  role_title: string | null;
  phone: string | null;
  daily_rate: number | null;
  hourly_rate: number | null;
  overtime_rate: number | null;
};

type PayrollRow = {
  id: string;
  employee_id: string;
  payroll_date: string;
  total_amount: number | null;
  normal_days: number | null;
  normal_hours: number | null;
  overtime_hours: number | null;
  daily_rate: number | null;
  hourly_rate: number | null;
  overtime_rate: number | null;
  bonus_amount: number | null;
  advance_amount: number | null;
  loan_repayment_amount: number | null;
  custom_amount: number | null;
  notes: string | null;
  employees:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
  isWorkbookOnly?: boolean;
};

type DailyModuleKey = "bevetelek" | "kiadasok" | "munkavallaloi-koltsegek";

const dailyModuleKeys = new Set<BudgetModuleKey>([
  "bevetelek",
  "kiadasok",
  "munkavallaloi-koltsegek",
]);
const DAILY_PAGE_SIZE = 60;
const DAILY_DATABASE_LIMIT = 240;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCellValue(value: unknown) {
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) return formatMoney(value);
    return formatNumber(value);
  }

  if (typeof value === "string" && value.includes("T00:00:00")) {
    return new Intl.DateTimeFormat("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  }

  if (typeof value === "string") {
    return cleanWorkbookText(value);
  }

  return String(value ?? "");
}

function getPayrollEmployeeName(row: PayrollRow) {
  if (Array.isArray(row.employees)) {
    return row.employees[0]?.name ?? "Nincs dolgozó";
  }

  return row.employees?.name ?? "Nincs dolgozó";
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "Nincs dátum";

  return new Intl.DateTimeFormat("hu-HU", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesSearch(values: Array<string | number | null | undefined>, query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) return true;

  return values.some((value) => normalizeSearch(String(value ?? "")).includes(normalizedQuery));
}

function getReturnTo(moduleKey: DailyModuleKey, query: string) {
  const queryString = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";

  return `/app/${moduleKey}${queryString}#lista`;
}

function getPageNumber(value: string | undefined) {
  const page = Number(value ?? 1);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function paginateRows<T>(rows: T[], page: number) {
  const start = (page - 1) * DAILY_PAGE_SIZE;

  return rows.slice(start, start + DAILY_PAGE_SIZE);
}

function getPageHref(page: number, query: string) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("q", query.trim());
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}#lista` : "#lista";
}

function getSupabaseSearchValue(query: string) {
  return query.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ");
}

function getIlikePattern(query: string) {
  return `%${getSupabaseSearchValue(query)}%`;
}

function getIncomeDisplayKey(income: {
  customer_name?: string | null;
  income_date?: string | null;
  calculated_amount?: number | string | null;
  amount?: number | string | null;
  invoice_number?: string | null;
}) {
  const invoiceNumber = normalizeSearch(income.invoice_number ?? "");

  if (invoiceNumber) {
    return `invoice:${invoiceNumber}`;
  }

  return [
    normalizeSearch(income.customer_name ?? ""),
    String(income.income_date ?? "").slice(0, 10),
    Number(income.calculated_amount ?? income.amount ?? 0).toFixed(2),
    Number(income.amount ?? 0).toFixed(2),
  ].join("|");
}

function getExpenseDisplayKey(expense: {
  vendor_name?: string | null;
  item_name?: string | null;
  expense_date?: string | null;
  gross_amount?: number | string | null;
  invoice_number?: string | null;
}) {
  const invoiceNumber = normalizeSearch(expense.invoice_number ?? "");

  if (invoiceNumber) {
    return `invoice:${invoiceNumber}`;
  }

  return [
    normalizeSearch(expense.vendor_name ?? ""),
    normalizeSearch(expense.item_name ?? ""),
    String(expense.expense_date ?? "").slice(0, 10),
    Number(expense.gross_amount ?? 0).toFixed(2),
  ].join("|");
}

function getPayrollDisplayKey(row: {
  employee_name?: string | null;
  payroll_date?: string | null;
  normal_days?: number | string | null;
  normal_hours?: number | string | null;
  overtime_hours?: number | string | null;
  total_amount?: number | string | null;
}) {
  return [
    normalizeSearch(row.employee_name ?? ""),
    String(row.payroll_date ?? "").slice(0, 10),
    Number(row.normal_days ?? 0).toFixed(2),
    Number(row.normal_hours ?? 0).toFixed(2),
    Number(row.overtime_hours ?? 0).toFixed(2),
    Number(row.total_amount ?? 0).toFixed(2),
  ].join("|");
}

function getIncomeStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return "Fizetve";
    case "partial":
      return "Részben fizetve";
    case "draft":
      return "Piszkozat";
    case "cancelled":
      return "Törölve";
    case "unpaid":
    default:
      return "Nyitott";
  }
}

function getPaymentMethodLabel(method: string | null | undefined) {
  switch (method) {
    case "cash":
      return "Készpénz";
    case "transfer":
      return "Utalás";
    case "card":
      return "Kártya";
    case "other":
      return "Egyéb";
    default:
      return "";
  }
}

function getExpenseTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "client":
      return "Ügyfélhez tartozik";
    case "investment":
      return "Beruházás";
    case "other":
      return "Egyéb";
    case "operating":
    default:
      return "Működési";
  }
}

function getExpenseVatAmount(row: Pick<ExpenseEntryRow, "gross_amount" | "vat_amount" | "vat_rate">) {
  const grossAmount = Number(row.gross_amount ?? 0);
  const savedVatAmount = Number(row.vat_amount ?? 0);
  const vatRate = Number(row.vat_rate ?? 0);

  if (savedVatAmount > 0) {
    return savedVatAmount;
  }

  if (!grossAmount || !vatRate) {
    return 0;
  }

  return grossAmount - grossAmount / (1 + vatRate / 100);
}

function getExpenseNetAmount(row: Pick<ExpenseEntryRow, "gross_amount" | "vat_amount" | "vat_rate">) {
  return Number(row.gross_amount ?? 0) - getExpenseVatAmount(row);
}

async function DailyEntryModulePage({
  moduleKey,
  title,
  query,
  page,
}: {
  moduleKey: DailyModuleKey;
  title: string;
  query: string;
  page: number;
}) {
  const supabase = await createClient();
  const { data: authData } = await withTimeout(
    supabase.auth.getUser(),
    { data: { user: null }, error: null } as unknown as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >,
    3500,
  );
  const isTestAccount =
    authData.user?.email?.toLocaleLowerCase("hu-HU") === "teszt@teszt.com";
  const today = getLocalDateKey();
  const searchValue = getSupabaseSearchValue(query);
  const searchPattern = getIlikePattern(query);
  let incomeQuery = supabase
    .from("income_entries")
    .select("id, income_date, customer_name, site_address, description, calculated_amount, amount, status, payment_method, invoice_number, is_vat_invoice, notes")
    .order("income_date", { ascending: false })
    .limit(DAILY_DATABASE_LIMIT);
  let expenseQuery = supabase
    .from("expense_entries")
    .select("id, expense_date, vendor_name, item_name, gross_amount, vat_rate, vat_amount, expense_type, payment_method, invoice_number, notes")
    .order("expense_date", { ascending: false })
    .limit(DAILY_DATABASE_LIMIT);
  const payrollQuery = supabase
    .from("employee_payroll_entries")
    .select("id, employee_id, payroll_date, total_amount, normal_days, normal_hours, overtime_hours, daily_rate, hourly_rate, overtime_rate, bonus_amount, advance_amount, loan_repayment_amount, custom_amount, notes, employees(name)")
    .order("payroll_date", { ascending: false })
    .limit(DAILY_DATABASE_LIMIT);

  if (searchValue) {
    incomeQuery = incomeQuery.or(
      `customer_name.ilike.${searchPattern},site_address.ilike.${searchPattern},description.ilike.${searchPattern},invoice_number.ilike.${searchPattern},notes.ilike.${searchPattern}`,
    );
    expenseQuery = expenseQuery.or(
      `vendor_name.ilike.${searchPattern},item_name.ilike.${searchPattern},invoice_number.ilike.${searchPattern},notes.ilike.${searchPattern}`,
    );
  }
  const [incomeResult, expenseResult, employeeResult, payrollResult] =
    await Promise.all([
      withTimeout(
        incomeQuery,
        createQueryFallbackSuccess([]),
        3500,
      ),
      withTimeout(
        expenseQuery,
        createQueryFallbackSuccess([]),
        3500,
      ),
      withTimeout(
        supabase
          .from("employees")
          .select("id, name, role_title, phone, daily_rate, hourly_rate, overtime_rate")
          .order("name", { ascending: true })
          .limit(120),
        createQueryFallbackSuccess([]),
        3500,
      ),
      withTimeout(
        payrollQuery,
        createQueryFallbackSuccess([]),
        3500,
      ),
    ]);

  const databaseIncomes = (incomeResult.data ?? []) as IncomeEntryRow[];
  const databaseExpenses = (expenseResult.data ?? []) as ExpenseEntryRow[];
  const employees = (employeeResult.data ?? []) as EmployeeRow[];
  const databasePayrollRows = (payrollResult.data ?? []) as unknown as PayrollRow[];
  const workbookIncomeRows = isTestAccount ? [] : getWorkbookIncomeEntries();
  const workbookExpenseRows = isTestAccount ? [] : getWorkbookExpenseEntries();
  const workbookPayrollRows = isTestAccount ? [] : getWorkbookPayrollEntries();
  const databaseIncomeKeys = new Set(
    databaseIncomes.map((income) => getIncomeDisplayKey(income)),
  );
  const databaseExpenseKeys = new Set(
    databaseExpenses.map((expense) => getExpenseDisplayKey(expense)),
  );
  const databasePayrollKeys = new Set(
    databasePayrollRows.map((row) =>
      getPayrollDisplayKey({
        employee_name: getPayrollEmployeeName(row),
        payroll_date: row.payroll_date,
        normal_days: row.normal_days,
        normal_hours: row.normal_hours,
        overtime_hours: row.overtime_hours,
        total_amount: row.total_amount,
      }),
    ),
  );
  const workbookOnlyIncomes: IncomeEntryRow[] = workbookIncomeRows
    .filter((income) => {
      const key = getIncomeDisplayKey({
        customer_name: income.customerName,
        income_date: income.incomeDate,
        calculated_amount: income.calculatedAmount,
        amount: income.amount,
        invoice_number: income.invoiceNumber,
      });

      return !databaseIncomeKeys.has(key);
    })
    .map((income) => ({
      id: income.id,
      income_date: income.incomeDate,
      customer_name: income.customerName,
      site_address: income.siteAddress || null,
      description: income.description || null,
      calculated_amount: income.calculatedAmount,
      amount: income.amount,
      status: income.status,
      payment_method: income.paymentMethod,
      invoice_number: income.invoiceNumber || null,
      is_vat_invoice: income.isVatInvoice,
      notes: income.notes || null,
      isWorkbookOnly: true,
    }));
  const workbookOnlyExpenses: ExpenseEntryRow[] = workbookExpenseRows
    .filter((expense) => {
      const key = getExpenseDisplayKey({
        vendor_name: expense.vendorName,
        item_name: expense.itemName,
        expense_date: expense.expenseDate,
        gross_amount: expense.grossAmount,
        invoice_number: expense.invoiceNumber,
      });

      return !databaseExpenseKeys.has(key);
    })
    .map((expense) => ({
      id: expense.id,
      expense_date: expense.expenseDate,
      vendor_name: expense.vendorName,
      item_name: expense.itemName,
      gross_amount: expense.grossAmount,
      vat_rate: expense.vatRate,
      vat_amount: expense.vatAmount,
      expense_type: expense.expenseType,
      payment_method: expense.paymentMethod,
      invoice_number: expense.invoiceNumber || null,
      notes: expense.notes || null,
      isWorkbookOnly: true,
    }));
  const workbookOnlyPayrollRows: PayrollRow[] = workbookPayrollRows
    .filter((row) => {
      const key = getPayrollDisplayKey({
        employee_name: row.employeeName,
        payroll_date: row.payrollDate,
        normal_days: row.normalDays,
        normal_hours: row.normalHours,
        overtime_hours: row.overtimeHours,
        total_amount: row.totalAmount,
      });

      return !databasePayrollKeys.has(key);
    })
    .map((row) => ({
      id: row.id,
      employee_id: "",
      payroll_date: row.payrollDate,
      total_amount: row.totalAmount,
      normal_days: row.normalDays,
      normal_hours: row.normalHours,
      overtime_hours: row.overtimeHours,
      daily_rate: row.dailyRate,
      hourly_rate: row.hourlyRate,
      overtime_rate: row.overtimeRate || 5000,
      bonus_amount: row.bonusAmount,
      advance_amount: 0,
      loan_repayment_amount: 0,
      custom_amount: row.customAmount,
      notes: row.notes || null,
      employees: { name: row.employeeName },
      isWorkbookOnly: true,
    }));
  const incomes = [...databaseIncomes, ...workbookOnlyIncomes].sort((a, b) =>
    b.income_date.localeCompare(a.income_date),
  );
  const expenses = [...databaseExpenses, ...workbookOnlyExpenses].sort((a, b) =>
    b.expense_date.localeCompare(a.expense_date),
  );
  const payrollRows = [...databasePayrollRows, ...workbookOnlyPayrollRows].sort((a, b) =>
    b.payroll_date.localeCompare(a.payroll_date),
  );
  const filteredIncomes = incomes.filter((row) =>
    includesSearch(
      [
        row.customer_name,
        row.site_address,
        row.description,
        row.status,
        row.payment_method,
        row.invoice_number,
        row.amount,
      ],
      query,
    ),
  );
  const filteredExpenses = expenses.filter((row) =>
    includesSearch(
      [
        row.vendor_name,
        row.item_name,
        row.expense_type,
        row.payment_method,
        row.invoice_number,
        row.gross_amount,
      ],
      query,
    ),
  );
  const filteredPayrollRows = payrollRows.filter((row) =>
    includesSearch(
      [
        getPayrollEmployeeName(row),
        row.payroll_date,
        row.normal_days,
        row.normal_hours,
        row.overtime_hours,
        row.total_amount,
        row.notes,
      ],
      query,
    ),
  );
  const pagedIncomes = paginateRows(filteredIncomes, page);
  const pagedExpenses = paginateRows(filteredExpenses, page);
  const pagedPayrollRows = paginateRows(filteredPayrollRows, page);
  const returnTo = getReturnTo(moduleKey, query);
  const workbookPayrollCount = workbookOnlyPayrollRows.length;
  const payrollEmployeeOptions = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    dailyRate: employee.daily_rate ?? 0,
    hourlyRate: employee.hourly_rate ?? 0,
    overtimeRate: employee.overtime_rate ?? 5000,
  }));

  return (
    <main className="flex w-full flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Napi rögzítés
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17130f] lg:text-3xl">
            {title}
          </h1>
        </div>
        <Link
          href="/app"
          className="rounded-full border-2 border-[#bfa988] bg-white px-4 py-2 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Központ
        </Link>
      </div>

      {moduleKey === "bevetelek" ? (
        <>
          <EntryPanel title="Új bevétel">
            <IncomeForm today={today} returnTo="/app/bevetelek" />
          </EntryPanel>
          {workbookOnlyIncomes.length ? (
            <form action={importWorkbookIncomes}>
              <button className="w-fit rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
                Meglévő bevételek bemásolása ({workbookOnlyIncomes.length})
              </button>
            </form>
          ) : null}
          <SearchPanel
            page={page}
            query={query}
            total={incomes.length}
            visible={filteredIncomes.length}
          />
          <IncomeTable rows={pagedIncomes} returnTo={returnTo} />
          <Pagination page={page} query={query} total={filteredIncomes.length} />
        </>
      ) : null}

      {moduleKey === "kiadasok" ? (
        <>
          <EntryPanel title="Új kiadás">
            <ExpenseForm today={today} returnTo="/app/kiadasok" />
          </EntryPanel>
          {workbookOnlyExpenses.length ? (
            <form action={importWorkbookExpenses}>
              <button className="w-fit rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
                Meglévő kiadások bemásolása ({workbookOnlyExpenses.length})
              </button>
            </form>
          ) : null}
          <SearchPanel
            page={page}
            query={query}
            total={expenses.length}
            visible={filteredExpenses.length}
          />
          <ExpenseTable rows={pagedExpenses} returnTo={returnTo} />
          <Pagination page={page} query={query} total={filteredExpenses.length} />
        </>
      ) : null}

      {moduleKey === "munkavallaloi-koltsegek" ? (
        <>
          <EntryPanel title="Heti fizetés / munkavállalói költség">
            <PayrollForm
              employees={payrollEmployeeOptions}
              today={today}
              returnTo="/app/munkavallaloi-koltsegek"
            />
          </EntryPanel>
          {workbookPayrollCount ? (
            <form action={importWorkbookPayrollEntries}>
              <button className="w-fit rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
                Meglévő munkavállalói költségek bemásolása ({workbookPayrollCount})
              </button>
            </form>
          ) : null}
          <SearchPanel
            page={page}
            query={query}
            total={payrollRows.length}
            visible={filteredPayrollRows.length}
          />
          <PayrollTable
            employees={payrollEmployeeOptions}
            returnTo={returnTo}
            rows={pagedPayrollRows}
          />
          <Pagination page={page} query={query} total={filteredPayrollRows.length} />
          <details className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
            <summary className="cursor-pointer list-none text-xl font-bold text-[#17130f]">
              Új dolgozó
            </summary>
            <form action={createEmployee} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="returnTo" value="/app/munkavallaloi-koltsegek" />
              <PlainField id="employeeName" label="Név" name="name" />
              <PlainField id="roleTitle" label="Munkakör" name="roleTitle" />
              <PlainField id="employeePhone" label="Telefon" name="phone" />
              <PlainField id="employeeDailyRate" label="Napi bér" name="dailyRate" inputMode="decimal" />
              <PlainField id="employeeHourlyRate" label="Órabér" name="hourlyRate" inputMode="decimal" />
              <PlainField id="employeeOvertimeRate" label="Túlóra díj" name="overtimeRate" inputMode="decimal" defaultValue="5000" />
              <button className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white md:col-span-2 md:w-fit">
              Dolgozó mentése
              </button>
            </form>
          </details>
        </>
      ) : null}
    </main>
  );
}

function SearchPanel({
  query,
  total,
  visible,
  page,
}: {
  query: string;
  total: number;
  visible: number;
  page: number;
}) {
  return (
    <section className="sticky top-3 z-20 rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
      <form className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 space-y-2">
        <span className="text-sm font-bold text-[#2a211a]">Keresés</span>
          <input
            name="q"
            defaultValue={query}
          placeholder="Név, dátum, összeg, számla..."
            className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
          />
        </label>
        <button className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white">
          Keresés
        </button>
        <Link
          href="?"
          className="rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-center text-sm font-bold text-[#1f1a15]"
        >
          Törlés
        </Link>
      </form>
      <p className="mt-3 text-sm font-semibold text-[#5f5144]">
        {visible} találat / {total} összes sor · {page}. oldal
      </p>
    </section>
  );
}

function Pagination({
  page,
  query,
  total,
}: {
  page: number;
  query: string;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / DAILY_PAGE_SIZE));

  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Lapozás"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]"
    >
      <p className="text-sm font-bold text-[#493b2f]">
        {page}. oldal / {pageCount} oldal
      </p>
      <div className="flex flex-wrap gap-2">
        {page > 1 ? (
          <Link
            href={getPageHref(page - 1, query)}
            className="rounded-full border-2 border-[#bfa988] bg-white px-4 py-2 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
          >
            Előző
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link
            href={getPageHref(page + 1, query)}
            className="rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1d4d39]"
          >
            Következő
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function EditField({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-bold text-[#2a211a]">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-white px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
      />
    </label>
  );
}

function EditTextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="space-y-1 text-sm font-bold text-[#2a211a] md:col-span-2">
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-white px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
      />
    </label>
  );
}

function EditSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1 text-sm font-bold text-[#2a211a]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-white px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RowActions({
  id,
  returnTo,
  deleteAction,
}: {
  id: string;
  returnTo: string;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={deleteAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <ConfirmSubmitButton
                  message="Biztosan törlöd ezt a sort?"
        className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
      >
                  Törlés
      </ConfirmSubmitButton>
    </form>
  );
}

function IncomeTable({
  rows,
  returnTo,
}: {
  rows: IncomeEntryRow[];
  returnTo: string;
}) {
  return (
    <section id="lista" className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
      <h2 className="text-xl font-bold text-[#17130f]">Bevételek listája</h2>
      <div className="mt-3 max-h-[62vh] overflow-auto rounded-[18px] border border-[#eadfce]">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#fff8ee] text-[#493b2f] shadow-sm">
            <tr>
                    <th className="px-3 py-3">Dátum</th>
                    <th className="px-3 py-3">Ügyfél</th>
                    <th className="px-3 py-3">Helyszín</th>
                    <th className="px-3 py-3">Összeg</th>
              <th className="px-3 py-3">Fizetve</th>
                    <th className="px-3 py-3">Fizetés</th>
                    <th className="px-3 py-3">Számla</th>
                    <th className="px-3 py-3">Megjegyzés</th>
                    <th className="px-3 py-3">Művelet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#eadfce] align-top">
                <td className="px-3 py-3">{formatShortDate(row.income_date)}</td>
                <td className="px-3 py-3 font-bold">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.customer_name}
                    {row.isWorkbookOnly ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
                        Excel
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3">{row.site_address}</td>
                <td className="px-3 py-3 font-bold text-[#1e5a40]">{formatMoney(row.amount ?? 0)}</td>
                <td className="px-3 py-3">{getIncomeStatusLabel(row.status)}</td>
                <td className="px-3 py-3">{getPaymentMethodLabel(row.payment_method)}</td>
                <td className="px-3 py-3">{row.invoice_number}</td>
                <td className="max-w-[260px] px-3 py-3 text-xs leading-5 text-[#44382e]">
                  {row.notes || row.description || ""}
                </td>
                <td className="px-3 py-3">
                  {row.isWorkbookOnly ? (
                    <span className="text-[#8b7b68]">-</span>
                  ) : (
                  <details>
                          <summary className="cursor-pointer font-bold text-[#1e5a40]">Módosítás</summary>
                    <form action={updateIncomeEntry} className="mt-3 grid min-w-[520px] gap-3 rounded-[18px] bg-[#fff8ee] p-3 md:grid-cols-2">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                            <EditField label="Dátum" name="incomeDate" type="date" defaultValue={row.income_date} />
                            <EditField label="Ügyfél" name="customerName" defaultValue={row.customer_name} />
                            <EditField label="Helyszín" name="siteAddress" defaultValue={row.site_address} />
                            <EditField label="Bruttó összeg" name="amount" defaultValue={row.amount} />
                      <EditSelect
                              label="Állapot"
                        name="status"
                        defaultValue={row.status}
                        options={[
                          { value: "paid", label: "Fizetve" },
                          { value: "unpaid", label: "Nyitott" },
                                { value: "partial", label: "Részben fizetve" },
                          { value: "draft", label: "Piszkozat" },
                        ]}
                      />
                      <EditSelect
                              label="Fizetés módja"
                        name="paymentMethod"
                        defaultValue={row.payment_method}
                        options={[
                          { value: "", label: "Nincs megadva" },
                                { value: "cash", label: "Készpénz" },
                                { value: "transfer", label: "Utalás" },
                                { value: "card", label: "Kártya" },
                                { value: "other", label: "Egyéb" },
                        ]}
                      />
                            <EditField label="Számla" name="invoiceNumber" defaultValue={row.invoice_number} />
                            <EditField label="ÁFA %" name="vatRate" defaultValue={27} />
                      <label className="flex items-center gap-2 text-sm font-bold text-[#2a211a]">
                        <input name="isVatInvoice" type="checkbox" defaultChecked={Boolean(row.is_vat_invoice)} />
                              Áfás bevétel
                      </label>
                            <EditTextArea label="Megjegyzés" name="notes" defaultValue={row.notes ?? row.description} />
                      <button className="rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white md:w-fit">
                              Mentés
                      </button>
                    </form>
                    <div className="mt-2">
                      <RowActions id={row.id} returnTo={returnTo} deleteAction={deleteIncomeEntry} />
                    </div>
                  </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      {!rows.length ? <p className="rounded-[16px] bg-[#fff8ee] px-4 py-3 text-sm font-semibold text-[#44382e]">Nincs találat.</p> : null}
      </div>
    </section>
  );
}

function ExpenseTable({
  rows,
  returnTo,
}: {
  rows: ExpenseEntryRow[];
  returnTo: string;
}) {
  return (
    <section id="lista" className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
      <h2 className="text-xl font-bold text-[#17130f]">Kiadások listája</h2>
      <div className="mt-3 max-h-[62vh] overflow-auto rounded-[18px] border border-[#eadfce]">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#fff8ee] text-[#493b2f] shadow-sm">
            <tr>
                    <th className="px-3 py-3">Dátum</th>
                    <th className="px-3 py-3">Szállító</th>
                    <th className="px-3 py-3">Tétel</th>
                    <th className="px-3 py-3">Nettó</th>
                    <th className="px-3 py-3">ÁFA</th>
                    <th className="px-3 py-3">Bruttó</th>
                    <th className="px-3 py-3">Típus</th>
                    <th className="px-3 py-3">Fizetés</th>
                    <th className="px-3 py-3">Számla</th>
                    <th className="px-3 py-3">Művelet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#eadfce] align-top">
                <td className="px-3 py-3">{formatShortDate(row.expense_date)}</td>
                <td className="px-3 py-3 font-bold">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.vendor_name}
                    {row.isWorkbookOnly ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
                        Excel
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3">{row.item_name}</td>
                <td className="px-3 py-3 font-semibold text-[#44382e]">
                  {formatMoney(getExpenseNetAmount(row))}
                </td>
                <td className="px-3 py-3 font-semibold text-[#44382e]">
                  {formatMoney(getExpenseVatAmount(row))}
                </td>
                <td className="px-3 py-3 font-bold text-[#1e5a40]">{formatMoney(row.gross_amount ?? 0)}</td>
                <td className="px-3 py-3">{getExpenseTypeLabel(row.expense_type)}</td>
                <td className="px-3 py-3">{getPaymentMethodLabel(row.payment_method)}</td>
                <td className="px-3 py-3">{row.invoice_number}</td>
                <td className="px-3 py-3">
                  {row.isWorkbookOnly ? (
                    <span className="text-[#8b7b68]">-</span>
                  ) : (
                  <details>
                          <summary className="cursor-pointer font-bold text-[#1e5a40]">Módosítás</summary>
                    <form action={updateExpenseEntry} className="mt-3 grid min-w-[520px] gap-3 rounded-[18px] bg-[#fff8ee] p-3 md:grid-cols-2">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                            <EditField label="Dátum" name="expenseDate" type="date" defaultValue={row.expense_date} />
                            <EditField label="Szállító" name="vendorName" defaultValue={row.vendor_name} />
                            <EditField label="Tétel" name="itemName" defaultValue={row.item_name} />
                            <EditField label="Bruttó" name="grossAmount" defaultValue={row.gross_amount} />
                            <EditField label="ÁFA %" name="vatRate" defaultValue={row.vat_rate ?? 27} />
                      <EditSelect
                              label="Típus"
                        name="expenseType"
                        defaultValue={row.expense_type}
                        options={[
                                { value: "operating", label: "Működési" },
                                { value: "client", label: "Ügyfélhez tartozik" },
                                { value: "investment", label: "Beruházás" },
                                { value: "other", label: "Egyéb" },
                        ]}
                      />
                      <EditSelect
                        label="Fizetés módja"
                        name="paymentMethod"
                        defaultValue={row.payment_method}
                        options={[
                          { value: "", label: "Nincs megadva" },
                          { value: "cash", label: "Készpénz" },
                          { value: "transfer", label: "Utalás" },
                          { value: "card", label: "Kártya" },
                          { value: "other", label: "Egyéb" },
                        ]}
                      />
                            <EditField label="Számla" name="invoiceNumber" defaultValue={row.invoice_number} />
                            <EditTextArea label="Megjegyzés" name="notes" defaultValue={row.notes} />
                      <button className="rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white md:w-fit">
                              Mentés
                      </button>
                    </form>
                    <div className="mt-2">
                      <RowActions id={row.id} returnTo={returnTo} deleteAction={deleteExpenseEntry} />
                    </div>
                  </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      {!rows.length ? <p className="rounded-[16px] bg-[#fff8ee] px-4 py-3 text-sm font-semibold text-[#44382e]">Nincs találat.</p> : null}
      </div>
    </section>
  );
}

function PayrollTable({
  rows,
  employees,
  returnTo,
}: {
  rows: PayrollRow[];
  employees: PayrollEmployeeOption[];
  returnTo: string;
}) {
  return (
    <section id="lista" className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
      <h2 className="text-xl font-bold text-[#17130f]">Munkavállalói költségek listája</h2>
      <div className="mt-3 max-h-[62vh] overflow-auto rounded-[18px] border border-[#eadfce]">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#fff8ee] text-[#493b2f] shadow-sm">
            <tr>
                    <th className="px-3 py-3">Dátum</th>
                    <th className="px-3 py-3">Dolgozó</th>
              <th className="px-3 py-3">Nap</th>
                    <th className="px-3 py-3">Óra</th>
                    <th className="px-3 py-3">Túlóra</th>
                    <th className="px-3 py-3">Összeg</th>
                    <th className="px-3 py-3">Művelet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#eadfce] align-top">
                <td className="px-3 py-3">{formatShortDate(row.payroll_date)}</td>
                <td className="px-3 py-3 font-bold">
                  <div className="flex flex-wrap items-center gap-2">
                    {getPayrollEmployeeName(row)}
                    {row.isWorkbookOnly ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
                        Excel
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3">{formatNumber(row.normal_days ?? 0)}</td>
                <td className="px-3 py-3">{formatNumber(row.normal_hours ?? 0)}</td>
                <td className="px-3 py-3">{formatNumber(row.overtime_hours ?? 0)}</td>
                <td className="px-3 py-3 font-bold text-[#1e5a40]">{formatMoney(row.total_amount ?? 0)}</td>
                <td className="px-3 py-3">
                  {row.isWorkbookOnly ? (
                    <span className="text-[#8b7b68]">-</span>
                  ) : (
                  <details>
                          <summary className="cursor-pointer font-bold text-[#1e5a40]">Módosítás</summary>
                    <form action={updatePayrollEntry} className="mt-3 grid min-w-[620px] gap-3 rounded-[18px] bg-[#fff8ee] p-3 md:grid-cols-2">
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <EditSelect
                              label="Dolgozó"
                        name="employeeId"
                        defaultValue={row.employee_id}
                        options={employees.map((employee) => ({
                          value: employee.id,
                          label: employee.name,
                        }))}
                      />
                            <EditField label="Dátum" name="payrollDate" type="date" defaultValue={row.payroll_date} />
                            <EditField label="Normál nap" name="normalDays" defaultValue={row.normal_days} />
                            <EditField label="Normál óra" name="normalHours" defaultValue={row.normal_hours} />
                            <EditField label="Túlóra" name="overtimeHours" defaultValue={row.overtime_hours} />
                            <EditField label="Napi bér" name="dailyRate" defaultValue={row.daily_rate} />
                            <EditField label="Órabér" name="hourlyRate" defaultValue={row.hourly_rate} />
                            <EditField label="Túlóra díj" name="overtimeRate" defaultValue={row.overtime_rate ?? 5000} />
                            <EditField label="Bónusz" name="bonusAmount" defaultValue={row.bonus_amount} />
                            <EditField label="Előleg" name="advanceAmount" defaultValue={row.advance_amount} />
                            <EditField label="Törlesztés" name="loanRepaymentAmount" defaultValue={row.loan_repayment_amount} />
                            <EditField label="Téli pénz / egyéni összeg" name="customAmount" defaultValue={row.custom_amount} />
                            <EditTextArea label="Megjegyzés" name="notes" defaultValue={row.notes} />
                      <button className="rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white md:w-fit">
                              Mentés
                      </button>
                    </form>
                    <div className="mt-2">
                      <RowActions id={row.id} returnTo={returnTo} deleteAction={deletePayrollEntry} />
                    </div>
                  </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      {!rows.length ? <p className="rounded-[16px] bg-[#fff8ee] px-4 py-3 text-sm font-semibold text-[#44382e]">Nincs találat.</p> : null}
      </div>
    </section>
  );
}

function EntryPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border-4 border-[#1e5a40] bg-white p-4 shadow-[0_18px_44px_rgba(26,20,16,0.12)] lg:p-5">
      <h2 className="mb-4 text-xl font-bold text-[#17130f]">{title}</h2>
      {children}
    </section>
  );
}

function PlainField({
  id,
  label,
  name,
  inputMode,
  defaultValue,
}: {
  id: string;
  label: string;
  name: string;
  inputMode?: "decimal" | "text";
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-[#2a211a]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        inputMode={inputMode}
        defaultValue={defaultValue}
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

export default async function BudgetModulePage({ params, searchParams }: PageProps) {
  const { module } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = resolvedSearchParams.q ?? "";
  const page = getPageNumber(resolvedSearchParams.page);
  const currentModule = budgetModules.find(
    (item) => item.key === (module as BudgetModuleKey),
  );

  if (!currentModule) {
    notFound();
  }

  const supabase = await createClient();
  const { data: authData } = await withTimeout(
    supabase.auth.getUser(),
    { data: { user: null }, error: null } as unknown as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >,
    3500,
  );
  const isTestAccount =
    authData.user?.email?.toLocaleLowerCase("hu-HU") === "teszt@teszt.com";

  if (dailyModuleKeys.has(currentModule.key)) {
    return (
      <DailyEntryModulePage
        moduleKey={currentModule.key as DailyModuleKey}
        page={page}
        query={query}
        title={currentModule.title}
      />
    );
  }

  if (isTestAccount) {
    return (
      <main className="flex w-full flex-1 flex-col gap-6">
        <Link
          href="/app"
          className="w-fit rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza a központhoz
        </Link>

        <section className="rounded-[30px] border-2 border-[#cdbda8] bg-[#fffaf3] p-6 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:p-8">
          <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
            Teszt fiók
          </p>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#17130f] lg:text-5xl">
            Ez a modul teszt módban üres.
          </h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[#44382e]">
            A teszt belépés nem mutat éles költségvetési, Excelből importált vagy pénzügyi adatokat.
          </p>
        </section>
      </main>
    );
  }

  const dataTables = getSheetTables(currentModule.sheetName).filter(
    (table) => table.rows.length && table.headers.length,
  );
  const summaryCards =
    currentModule.key === "koltsegvetes"
      ? getWorkbookOverviewCards()
      : getModuleSummaryCards(currentModule.sheetName);
  const monthlyRows = getBudgetMonthlyRows();
  const taskTotals =
    currentModule.key === "elszamolas-reszletezo" ? getTaskQuantityTotals() : [];
  const clientStats =
    currentModule.key === "ugyfelnyilvantartas" ? getClientStats() : null;
  const insight = getModuleInsight(currentModule.key);
  const topGroups = getModuleTopGroups(currentModule.key);

  return (
    <main className="flex w-full flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app"
          className="rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza a fő modulokhoz
        </Link>
      </div>

      <section className="rounded-[30px] border-2 border-[#cdbda8] bg-[#fffaf3] p-6 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:p-8">
        <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
        Költségvetés modul
        </p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#17130f] lg:text-5xl">
          {currentModule.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[#44382e]">
          {currentModule.description}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]"
          >
            <p className="text-sm font-bold text-[#493b2f]">{card.label}</p>
            <p className="mt-3 break-words text-2xl font-bold text-[#17130f]">
              {card.value}
            </p>
            {card.note ? (
              <p className="mt-2 text-sm font-medium leading-6 text-[#5f5144]">
                {card.note}
              </p>
            ) : null}
          </article>
        ))}
      </section>

      {currentModule.key === "koltsegvetes" ? (
        <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Napi, havi, éves statisztika
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Havi bontás a költségvetésből
              </h2>
            </div>
            <p className="rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white">
              {monthlyRows.length} hónap számolva
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fff8ee] text-[#493b2f]">
                <tr>
                    <th className="px-4 py-3 font-bold">Hónap</th>
                    <th className="px-4 py-3 font-bold">Munkák</th>
                    <th className="px-4 py-3 font-bold">Bevétel</th>
                    <th className="px-4 py-3 font-bold">Kiadás</th>
                  <th className="px-4 py-3 font-bold">Profit</th>
                    <th className="px-4 py-3 font-bold">Kintlévőség</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.month} className="border-t border-[#eadfce]">
                    <td className="px-4 py-3 font-bold text-[#17130f]">{row.month}</td>
                    <td className="px-4 py-3 text-[#44382e]">
                      {formatNumber(row.jobs)}
                    </td>
                    <td className="px-4 py-3 text-[#44382e]">
                      {formatMoney(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-[#44382e]">
                      {formatMoney(row.expenses)}
                    </td>
                    <td
                      className={`px-4 py-3 font-bold ${
                        row.profit >= 0 ? "text-[#1e5a40]" : "text-rose-700"
                      }`}
                    >
                      {formatMoney(row.profit)}
                    </td>
                    <td className="px-4 py-3 text-[#44382e]">
                      {formatMoney(row.unpaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {clientStats ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Összes ügyfél", clientStats.total],
            ["Aktív ügyfél", clientStats.active],
            ["Általányos ügyfél", clientStats.flatRate],
            ["Havi ügyfél", clientStats.monthly],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5"
            >
              <p className="text-sm font-bold text-[#493b2f]">{label}</p>
              <p className="mt-3 text-3xl font-bold text-[#17130f]">{value}</p>
            </article>
          ))}
        </section>
      ) : null}

      {insight ? (
        <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-[#10201a] p-5 text-white shadow-[0_16px_44px_rgba(10,20,17,0.22)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            Működő számítás
          </p>
          <h2 className="mt-2 text-2xl font-bold">{insight.title}</h2>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/72">
            {insight.description}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {insight.rows.map((row) => (
              <article
                key={row.label}
                className="rounded-[20px] border border-white/10 bg-white/8 p-4"
              >
                <p className="text-sm font-bold text-emerald-100">{row.label}</p>
                <p className="mt-2 text-2xl font-bold">{row.formattedValue}</p>
                {row.helper ? (
                  <p className="mt-2 text-xs font-semibold leading-5 text-white/62">
                    {row.helper}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {topGroups?.rows.length ? (
        <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <h2 className="text-2xl font-bold text-[#17130f]">{topGroups.title}</h2>
          <div className="mt-5 space-y-3">
            {topGroups.rows.map((row) => {
              const maxValue = Math.max(...topGroups.rows.map((item) => item.value), 1);
              const width = Math.max((row.value / maxValue) * 100, 4);

              return (
                <div key={row.label} className="rounded-[18px] bg-[#fff8ee] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold text-[#17130f]">{row.label}</p>
                    <p className="font-bold text-[#1e5a40]">{row.formattedValue}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e6dac9]">
                    <div
                      className="h-full rounded-full bg-[#1e5a40]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {taskTotals.length ? (
        <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <h2 className="text-2xl font-bold text-[#17130f]">
              Leggyakoribb elszámolt mennyiségek
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {taskTotals.map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4"
              >
                <p className="text-sm font-bold text-[#493b2f]">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#17130f]">
                  {formatNumber(item.value)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {dataTables.length ? (
        <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
                Teljes Excel-adat
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
                {currentModule.title}
              </h2>
            </div>
            <p className="rounded-full border border-[#d3c3ad] bg-[#fff8ee] px-4 py-2 text-sm font-bold text-[#493b2f]">
              {dataTables.length} tábla
            </p>
          </div>

          <div className="mt-5 grid gap-5">
            {dataTables.map((table) => (
              <section
                key={table.name}
                className="rounded-[20px] border border-[#eadfce] bg-[#fffdf9] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-[#17130f]">{table.name}</h3>
                  <p className="rounded-full bg-[#fff8ee] px-3 py-1 text-xs font-bold text-[#493b2f]">
                    {table.rows.length} sor · {table.headers.length} oszlop
                  </p>
                </div>
                <div className="mt-3 max-h-[62vh] overflow-auto rounded-[16px] border border-[#eadfce]">
                  <table className="w-full min-w-max text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#fff8ee] text-[#493b2f] shadow-sm">
                      <tr>
                        {table.headers.map((header) => (
                          <th key={header} className="whitespace-nowrap px-4 py-3 font-bold">
                            {cleanWorkbookText(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rowIndex) => (
                        <tr
                          key={`${table.name}-${String(row._excelRow ?? rowIndex)}`}
                          className="border-t border-[#eadfce]"
                        >
                          {table.headers.map((header) => (
                            <td
                              key={header}
                              className="max-w-[320px] whitespace-nowrap px-4 py-3 text-[#44382e]"
                            >
                              {formatCellValue(row[header])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}

    </main>
  );
}
