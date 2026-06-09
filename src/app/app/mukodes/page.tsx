import Link from "next/link";

import { importWorkbookPriceItems } from "@/app/app/arlista/actions";
import { deleteWorkLog, updateWorkLog } from "@/app/app/mukodes/actions";
import { ConfirmSubmitButton } from "@/app/app/mukodes/ConfirmSubmitButton";
import { WorkLogForm } from "@/app/app/mukodes/WorkLogForm";
import { withTimeout } from "@/lib/async";
import {
  getSettlementDetailItemHeaders,
  getSettlementDetailUnitOptions,
  getWorkbookCustomerOptions,
  getWorkbookPriceItems,
  type WorkbookCustomerOption,
  type WorkbookPriceItemOption,
} from "@/lib/budget/workbookData";
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
  site_address: string | null;
  notes: string | null;
  is_flat_rate: boolean | null;
  total_amount: number | null;
  labor_total: number | null;
  material_total: number | null;
  work_hours: number | null;
  status: string | null;
};

type WorkLogItemRow = {
  id: string;
  work_log_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_amount: number | null;
};

type WorkLogCrewRow = {
  id: string;
  work_log_id: string;
  crew_name: string;
  crew_count: number | null;
  started_at: string | null;
  finished_at: string | null;
  hourly_rate: number | null;
};

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  project_address: string | null;
  notes: string | null;
};

type PriceItemRow = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  unit_price: number | null;
  vat_rate: number | null;
  notes: string | null;
  source: string | null;
};

type ItemStat = {
  key: string;
  name: string;
  unit: string;
  quantity: number;
  amount: number;
};

const QUERY_TIMEOUT_MS = 3500;
const WORK_LOG_LIMIT = 60;
const CLIENT_LIMIT = 180;

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Nincs dátum";

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("hu-HU", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTimeInput(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getItemStats(
  items: WorkLogItemRow[],
  workLogDateById: Map<string, string>,
  predicate: (date: string) => boolean,
) {
  const grouped = new Map<string, ItemStat>();

  for (const item of items) {
    const workDate = workLogDateById.get(item.work_log_id);

    if (!workDate || !predicate(workDate)) {
      continue;
    }

    const name = item.name || "Nincs tételnév";
    const unit = item.unit || "db";
    const key = `${name}__${unit}`;
    const current = grouped.get(key) ?? {
      key,
      name,
      unit,
      quantity: 0,
      amount: 0,
    };

    current.quantity += Number(item.quantity ?? 0);
    current.amount += Number(item.total_amount ?? 0);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
}

export default async function OperationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: authData } = await withTimeout(
    supabase.auth.getUser(),
    { data: { user: null }, error: null } as unknown as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >,
    QUERY_TIMEOUT_MS,
  );
  const profileQuery = authData.user
    ? supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle()
    : null;
  const { data: profile } = profileQuery
    ? await withTimeout(
        profileQuery,
        {
          data: null,
          error: null,
          count: null,
          status: 200,
          statusText: "OK",
        } as Awaited<typeof profileQuery>,
        QUERY_TIMEOUT_MS,
      )
    : { data: null };
  const isStaff = profile?.role === "staff";
  const isTestAccount =
    authData.user?.email?.toLocaleLowerCase("hu-HU") === "teszt@teszt.com";
  const today = getLocalDateKey();
  const settlementTaskOptions = getSettlementDetailItemHeaders();
  const settlementUnitOptions = getSettlementDetailUnitOptions();
  const workbookCustomers = isTestAccount ? [] : getWorkbookCustomerOptions();
  const workbookPriceItems = isTestAccount ? [] : getWorkbookPriceItems();

  const [clientsResult, priceItemsResult] = isTestAccount
    ? [createQueryFallbackSuccess([]), createQueryFallbackSuccess([])]
    : await Promise.all([
        withTimeout(
          supabase
            .from("clients")
            .select("id, name, email, phone, billing_address, project_address, notes")
            .order("name", { ascending: true })
            .limit(CLIENT_LIMIT),
          createQueryFallbackSuccess([]),
          QUERY_TIMEOUT_MS,
        ),
        withTimeout(
          supabase
            .from("price_items")
            .select("id, name, category, unit, unit_price, vat_rate, notes, source")
            .eq("status", "active")
            .order("name", { ascending: true })
            .limit(600),
          createQueryFallbackSuccess([]),
          QUERY_TIMEOUT_MS,
        ),
      ]);
  const workLogsQuery = supabase
    .from("work_logs")
    .select(
      "id, work_date, customer_name, site_address, task_summary, notes, is_flat_rate, total_amount, labor_total, material_total, work_hours, status",
    )
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(isStaff ? 12 : WORK_LOG_LIMIT);
  const scopedWorkLogsQuery =
    isStaff && authData.user?.id
      ? workLogsQuery.eq("created_by", authData.user.id)
      : workLogsQuery;
  const workLogsResult = isTestAccount
    ? createQueryFallbackSuccess([])
    : await withTimeout(scopedWorkLogsQuery, createQueryFallbackSuccess([]), QUERY_TIMEOUT_MS);

  const workLogs = (workLogsResult.data ?? []) as WorkLogRow[];
  const workLogIds = workLogs.map((row) => row.id);
  const [workLogItemsResult, workLogCrewResult] = workLogIds.length
    ? await Promise.all([
        withTimeout(
          supabase
            .from("work_log_items")
            .select("id, work_log_id, name, quantity, unit, unit_price, total_amount")
            .in("work_log_id", workLogIds)
            .order("created_at", { ascending: true }),
          createQueryFallbackSuccess([]),
          QUERY_TIMEOUT_MS,
        ),
        withTimeout(
          supabase
            .from("work_log_crew_segments")
            .select("id, work_log_id, crew_name, crew_count, started_at, finished_at, hourly_rate")
            .in("work_log_id", workLogIds)
            .order("created_at", { ascending: true }),
          createQueryFallbackSuccess([]),
          QUERY_TIMEOUT_MS,
        ),
      ])
    : [createQueryFallbackSuccess([]), createQueryFallbackSuccess([])];
  const workLogItems = (workLogItemsResult.data ?? []) as WorkLogItemRow[];
  const workLogCrewSegments = (workLogCrewResult.data ?? []) as WorkLogCrewRow[];
  const itemsByWorkLogId = groupByWorkLogId(workLogItems);
  const crewByWorkLogId = groupByWorkLogId(workLogCrewSegments);
  const clients = (clientsResult.data ?? []) as ClientRow[];
  const priceItems = (priceItemsResult.data ?? []) as PriceItemRow[];

  const customerOptions = mergeCustomerOptions(
    clients.map((client) => ({
      id: client.id,
      name: client.name,
      address: client.project_address ?? client.billing_address ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      notes: client.notes ?? "",
    })),
    workbookCustomers,
  );
  const priceOptions = mergePriceOptions(
    priceItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category ?? "",
      unit: item.unit,
      unitPrice: item.unit_price ?? 0,
      vatRate: item.vat_rate ?? 27,
      notes: item.notes ?? "",
      source: item.source ?? "",
    })),
    workbookPriceItems,
  );
  const importedPriceKeys = new Set(
    priceItems.map((item) => `${normalizeKey(item.name)}__${normalizeKey(item.unit)}`),
  );
  const workbookPriceImportCount = workbookPriceItems.filter(
    (item) => !importedPriceKeys.has(`${normalizeKey(item.name)}__${normalizeKey(item.unit)}`),
  ).length;
  const setupError =
    workLogsResult.error?.message ??
    workLogItemsResult.error?.message ??
    workLogCrewResult.error?.message ??
    clientsResult.error?.message ??
    priceItemsResult.error?.message ??
    "";
  const dailyWork = { count: 0, amount: 0 };
  const monthlyWork = { count: 0, amount: 0 };
  const yearlyWork = { count: 0, amount: 0 };
  const monthlyItemStats = getItemStats([], new Map(), () => false);

  return (
    <main className="flex w-full flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Napi munkalap
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17130f] lg:text-3xl">
            Mai munka rögzítése
          </h1>
        </div>
        {!isStaff ? (
          <Link
            href="/app"
            className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-4 py-2 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
          >
            Központ
          </Link>
        ) : null}
      </div>

      <Feedback message={params.message} error={params.error} setupError={setupError} />

      <section className="rounded-[26px] border-4 border-[#1e5a40] bg-white p-4 shadow-[0_18px_44px_rgba(26,20,16,0.12)] lg:p-5">
        <WorkLogForm
          today={today}
          taskOptions={settlementTaskOptions}
          unitOptions={settlementUnitOptions}
          priceOptions={priceOptions}
          customerOptions={customerOptions}
        />
      </section>

      <RecentList
        title={isStaff ? "Saját mentett munkalapok" : "Legutóbbi munkalapok"}
        empty="Még nincs mentett munkalap."
        rows={workLogs.map((row) => ({
          id: row.id,
          title: row.customer_name,
          meta: `${formatDate(row.work_date)} · ${formatNumber(row.work_hours)} óra`,
          value: formatMoney(row.total_amount),
          note: [row.site_address, row.task_summary].filter(Boolean).join(" · "),
          workDate: row.work_date,
          customerName: row.customer_name,
          siteAddress: row.site_address ?? "",
          taskSummary: row.task_summary,
          notes: row.notes ?? "",
          isFlatRate: Boolean(row.is_flat_rate),
          crewSegments: crewByWorkLogId.get(row.id) ?? [],
          items: itemsByWorkLogId.get(row.id) ?? [],
          updateAction: updateWorkLog,
          deleteAction: deleteWorkLog,
        }))}
      />

      {!isStaff && workbookPriceImportCount ? (
        <details className="rounded-[18px] border-2 border-[#d3c3ad] bg-white p-3">
          <summary className="cursor-pointer text-sm font-bold text-[#1e5a40]">
            Tételárak kezelése
          </summary>
          <form action={importWorkbookPriceItems} className="mt-3">
            <button className="w-fit rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Hiányzó tételárak bemásolása ({workbookPriceImportCount})
            </button>
          </form>
        </details>
      ) : null}

      {false && !isStaff ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Ma" value={formatMoney(dailyWork.amount)} note={`${dailyWork.count} munkalap`} />
            <StatCard label="Hónap" value={formatMoney(monthlyWork.amount)} note={`${monthlyWork.count} munkalap`} />
            <StatCard label="Év" value={formatMoney(yearlyWork.amount)} note={`${yearlyWork.count} munkalap`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <RecentList
              title="Friss munkalapok"
              empty="Még nincs munkalap."
              rows={workLogs.slice(0, 8).map((row) => ({
                id: row.id,
                title: row.customer_name,
                meta: `${formatDate(row.work_date)} · ${row.status ?? "nincs állapot"}`,
                value: formatMoney(row.total_amount),
                note: row.task_summary,
                deleteAction: deleteWorkLog,
              }))}
            />

            <section className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
              <h2 className="text-xl font-bold text-[#17130f]">Havi tételstatisztika</h2>
              <div className="mt-3 overflow-x-auto">
                {monthlyItemStats.length ? (
                  <table className="min-w-[520px] w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-xs font-bold uppercase tracking-[0.12em] text-[#674b25]">
                        <th className="px-3 py-2">Tétel</th>
                        <th className="px-3 py-2">Mennyiség</th>
                        <th className="px-3 py-2">Érték</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyItemStats.map((item) => (
                        <tr key={item.key} className="bg-[#fff8ee] text-sm font-semibold text-[#17130f]">
                          <td className="rounded-l-[14px] px-3 py-3">{item.name}</td>
                          <td className="px-3 py-3">
                            {formatNumber(item.quantity)} {item.unit}
                          </td>
                          <td className="rounded-r-[14px] px-3 py-3 text-[#1e5a40]">
                            {formatMoney(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="rounded-[16px] bg-[#fff8ee] px-4 py-3 text-sm font-semibold text-[#44382e]">
                    Még nincs havi tételadat.
                  </p>
                )}
              </div>
            </section>
          </section>
        </>
      ) : null}

    </main>
  );
}

function mergeCustomerOptions(
  databaseCustomers: WorkbookCustomerOption[],
  workbookCustomers: WorkbookCustomerOption[],
) {
  const seen = new Set<string>();
  const merged: WorkbookCustomerOption[] = [];

  for (const customer of [...databaseCustomers, ...workbookCustomers]) {
    const key = customer.name.trim().toLocaleLowerCase("hu-HU");

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(customer);
  }

  return merged;
}

function groupByWorkLogId<T extends { work_log_id: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    grouped.set(row.work_log_id, [...(grouped.get(row.work_log_id) ?? []), row]);
  }

  return grouped;
}

function normalizeKey(value: string) {
  return value
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergePriceOptions(
  databaseItems: WorkbookPriceItemOption[],
  workbookItems: WorkbookPriceItemOption[],
) {
  const items = new Map<string, WorkbookPriceItemOption>();

  for (const item of [...workbookItems, ...databaseItems]) {
    const normalizedName = normalizeKey(item.name);
    const key = `${normalizedName}__${normalizeKey(item.unit)}`;
    const current = items.get(key);

    if (!normalizedName || (current && current.unitPrice >= item.unitPrice)) {
      continue;
    }

    items.set(key, item);
  }

  return Array.from(items.values()).sort((a, b) => a.name.localeCompare(b.name, "hu-HU"));
}

function Feedback({
  message,
  error,
  setupError,
}: {
  message?: string;
  error?: string;
  setupError?: string;
}) {
  return (
    <>
      {message ? (
        <section className="rounded-[18px] border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950">
          {message}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[18px] border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-950">
          {error}
        </section>
      ) : null}

      {setupError ? (
        <section className="rounded-[18px] border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          Supabase hiba: {setupError}
        </section>
      ) : null}
    </>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-300 bg-emerald-50"
      : tone === "negative"
        ? "border-rose-300 bg-rose-50"
        : "border-[#d3c3ad] bg-white";

  return (
    <article className={`rounded-[18px] border-2 p-4 shadow-[0_12px_28px_rgba(26,20,16,0.06)] ${toneClass}`}>
      <p className="text-sm font-bold text-[#493b2f]">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-[#17130f]">{value}</p>
      <p className="mt-1 text-sm font-semibold text-[#5f5144]">{note}</p>
    </article>
  );
}

function RecentList({
  title,
  empty,
  rows,
  action,
}: {
  title: string;
  empty: string;
  action?: React.ReactNode;
  rows: Array<{
    id: string;
    title: string;
    meta: string;
    value: string;
    note?: string;
    badge?: string;
    workDate?: string;
    customerName?: string;
    siteAddress?: string;
    taskSummary?: string;
    notes?: string;
    isFlatRate?: boolean;
    crewSegments?: WorkLogCrewRow[];
    items?: WorkLogItemRow[];
    updateAction?: (formData: FormData) => Promise<void>;
    deleteAction?: (formData: FormData) => Promise<void>;
  }>;
}) {
  return (
    <section className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#17130f]">{title}</h2>
        {action}
      </div>
      <div className="mt-3 max-h-[460px] space-y-2 overflow-y-auto pr-1">
        {rows.length ? (
          rows.map((row) => {
            const crewRows = [
              ...(row.crewSegments?.length
                ? row.crewSegments
                : [
                    {
                      id: `${row.id}-crew`,
                      work_log_id: row.id,
                      crew_name: "1. csapat",
                      crew_count: 1,
                      started_at: "",
                      finished_at: "",
                      hourly_rate: 8000,
                    },
                  ]),
              {
                id: `${row.id}-new-crew`,
                work_log_id: row.id,
                crew_name: "",
                crew_count: null,
                started_at: "",
                finished_at: "",
                hourly_rate: 8000,
              },
            ];
            const itemRows = [
              ...(row.items ?? []),
              {
                id: `${row.id}-new-item-1`,
                work_log_id: row.id,
                name: "",
                quantity: null,
                unit: "db",
                unit_price: null,
                total_amount: null,
              },
              {
                id: `${row.id}-new-item-2`,
                work_log_id: row.id,
                name: "",
                quantity: null,
                unit: "db",
                unit_price: null,
                total_amount: null,
              },
            ];

            return (
            <article key={row.id} className="rounded-[16px] bg-[#fff8ee] px-4 py-3">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-bold text-[#17130f]">{row.title}</p>
                <p className="font-bold text-[#1e5a40]">{row.value}</p>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]">
                  {row.meta}
                </p>
                {row.badge ? (
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
                    {row.badge}
                  </span>
                ) : null}
              </div>
              {row.note ? (
                <p className="mt-1 text-sm font-semibold leading-6 text-[#5f5144]">{row.note}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {row.updateAction ? (
                  <details className="w-full rounded-[14px] border border-[#d8ccbc] bg-white px-3 py-2">
                    <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-[#1e5a40]">
                      Módosítás
                    </summary>
                    <form action={row.updateAction} className="mt-3 grid gap-2 md:grid-cols-2">
                      <input type="hidden" name="id" value={row.id} />
                      <label className="text-xs font-bold text-[#493b2f]">
                        Dátum
                        <input
                          type="date"
                          name="workDate"
                          defaultValue={row.workDate}
                          className="mt-1 w-full rounded-[12px] border border-[#d8ccbc] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f]"
                        />
                      </label>
                      <label className="text-xs font-bold text-[#493b2f]">
                        Ügyfél
                        <input
                          name="customerName"
                          defaultValue={row.customerName}
                          className="mt-1 w-full rounded-[12px] border border-[#d8ccbc] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f]"
                        />
                      </label>
                      <label className="text-xs font-bold text-[#493b2f] md:col-span-2">
                        Cím
                        <input
                          name="siteAddress"
                          defaultValue={row.siteAddress}
                          className="mt-1 w-full rounded-[12px] border border-[#d8ccbc] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f]"
                        />
                      </label>
                      <label className="text-xs font-bold text-[#493b2f] md:col-span-2">
                        Elvégzett munka
                        <textarea
                          name="taskSummary"
                          defaultValue={row.taskSummary}
                          className="mt-1 min-h-20 w-full rounded-[12px] border border-[#d8ccbc] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f]"
                        />
                      </label>
                      <div className="space-y-2 md:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]">
                          Csapatok és idő
                        </p>
                        {crewRows.map((crew, index) => (
                          <div
                            key={crew.id}
                            className="grid gap-2 rounded-[12px] border border-[#eadfce] bg-[#fffaf3] p-2 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.9fr]"
                          >
                            <input
                              name="crewName"
                              defaultValue={crew.crew_name}
                              placeholder={`${index + 1}. csapat`}
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                            <input
                              name="crewCount"
                              inputMode="decimal"
                              defaultValue={crew.crew_count ?? ""}
                              placeholder="Létszám"
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                            <input
                              name="startedAt"
                              defaultValue={formatTimeInput(crew.started_at)}
                              placeholder="Kezdés"
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                            <input
                              name="finishedAt"
                              defaultValue={formatTimeInput(crew.finished_at)}
                              placeholder="Végzés"
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                            <input
                              name="hourlyRate"
                              inputMode="decimal"
                              defaultValue={crew.hourly_rate ?? 8000}
                              placeholder="Óradíj"
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]">
                          Tételek
                        </p>
                        {itemRows.map((item, index) => (
                          <div
                            key={item.id}
                            className="grid gap-2 rounded-[12px] border border-[#eadfce] bg-[#fffaf3] p-2 md:grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr]"
                          >
                            <input
                              name="itemName"
                              defaultValue={item.name}
                              placeholder={`Tétel ${index + 1}`}
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                            <input
                              name="itemQuantity"
                              inputMode="decimal"
                              defaultValue={item.quantity ?? ""}
                              placeholder="Mennyiség"
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                            <input
                              name="itemUnit"
                              defaultValue={item.unit ?? "db"}
                              placeholder="Egység"
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                            <input
                              name="itemUnitPrice"
                              inputMode="decimal"
                              defaultValue={item.unit_price ?? ""}
                              placeholder="Egységár"
                              className="rounded-[10px] border border-[#d8ccbc] bg-white px-3 py-2 text-sm font-semibold text-[#17130f]"
                            />
                          </div>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 rounded-[12px] bg-[#fffaf3] px-3 py-2 text-xs font-bold text-[#493b2f] md:col-span-2">
                        <input type="checkbox" name="isFlatRate" defaultChecked={row.isFlatRate} />
                        Általányos ügyfélhez tartozik
                      </label>
                      <label className="text-xs font-bold text-[#493b2f] md:col-span-2">
                        Megjegyzés
                        <textarea
                          name="notes"
                          defaultValue={row.notes}
                          className="mt-1 min-h-16 w-full rounded-[12px] border border-[#d8ccbc] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f]"
                        />
                      </label>
                      <button className="w-fit rounded-full bg-[#1e5a40] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#184a34]">
                        Mentés
                      </button>
                    </form>
                  </details>
                ) : null}
                {row.deleteAction ? (
                  <form action={row.deleteAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <ConfirmSubmitButton
                      message="Biztosan törlöd ezt a sort?"
                      className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                    >
                      Törlés
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </div>
            </article>
          );
          })
        ) : (
          <p className="rounded-[16px] bg-[#fff8ee] px-4 py-3 text-sm font-semibold text-[#44382e]">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
