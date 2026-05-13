import { getWorkbookSheet } from "@/lib/budget/workbookData";

export type WorkbookRow = Record<string, unknown>;

export type SummaryCard = {
  label: string;
  value: string;
  note?: string;
};

export type InsightRow = {
  label: string;
  value: number;
  formattedValue: string;
  helper?: string;
};

export type ModuleInsight = {
  title: string;
  description: string;
  rows: InsightRow[];
};

export type MonthlyBudgetRow = {
  month: string;
  workdays: number;
  jobs: number;
  unpaid: number;
  cash: number;
  transfer: number;
  revenue: number;
  expenses: number;
  profit: number;
  payroll: number;
  operating: number;
  clientExpenses: number;
  investment: number;
  vat: number;
  closing: number;
};

export type OperationalDashboard = {
  activeMonth: MonthlyBudgetRow | null;
  bestMonth: MonthlyBudgetRow | null;
  weakestMonth: MonthlyBudgetRow | null;
  cards: SummaryCard[];
  dailyRevenueRows: DailyRevenueRow[];
  taskQuantityRows: InsightRow[];
  recentIncomeRows: WorkbookRow[];
  monthlyRows: Array<
    MonthlyBudgetRow & {
      averageRevenuePerWorkday: number;
      profitMargin: number;
    }
  >;
};

export type DailyRevenueRow = {
  date: string;
  revenue: number;
  paid: number;
  unpaid: number;
  rows: number;
};

const monthNames = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
];

export function formatMoney(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

export function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;

  const normalized = value
    .replace(/\s/g, "")
    .replace("Ft", "")
    .replace(",", ".")
    .trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateKey(value: unknown) {
  const date = toDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSheetTables(sheetName: string) {
  return getWorkbookSheet(sheetName)?.tables ?? [];
}

export function getTableRows(sheetName: string, tableName?: string) {
  const tables = getSheetTables(sheetName);
  const table = tableName
    ? tables.find((item) => item.name === tableName)
    : tables[0];

  return (table?.rows ?? []) as WorkbookRow[];
}

export function getAllSheetRows(sheetName: string) {
  return getSheetTables(sheetName).flatMap((table) => table.rows) as WorkbookRow[];
}

export function getBudgetMonthlyRows(): MonthlyBudgetRow[] {
  return getTableRows("Költségvetés", "Táblázat619")
    .filter((row) => monthNames.includes(toText(row["Havi bontás"])))
    .map((row) => ({
      month: toText(row["Havi bontás"]),
      workdays: toNumber(row["Munkanapok száma"]),
      jobs: toNumber(row["Munkák száma"]),
      unpaid: toNumber(row["Nincs fizetve"]),
      cash: toNumber(row["Készpénz"]),
      transfer: toNumber(row["Utalás"]),
      revenue: toNumber(row["Bevétel"]),
      expenses: toNumber(row["Összes kiadás"]),
      profit: toNumber(row["Profit"]),
      payroll: toNumber(row["Munkavállalói költségek"]),
      operating: toNumber(row["Működési költségek"]),
      clientExpenses: toNumber(row["Ügyfél kiadások"]),
      investment: toNumber(row["Beruházás"]),
      vat: toNumber(row["Áfa"]),
      closing: toNumber(row["Havi zárás"]),
    }));
}

export function sumRows(rows: WorkbookRow[], key: string) {
  return rows.reduce((sum, row) => sum + toNumber(row[key]), 0);
}

export function getNumericTotals(rows: WorkbookRow[], limit = 8) {
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key === "_excelRow") return;
      const numericValue = toNumber(value);
      if (!numericValue) return;
      totals.set(key, (totals.get(key) ?? 0) + numericValue);
    });
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

function normalizeGroupLabel(value: unknown, fallback = "Nincs megadva") {
  const text = toText(value);
  return text || fallback;
}

function groupSum({
  rows,
  groupKey,
  valueKey,
  limit = 8,
}: {
  rows: WorkbookRow[];
  groupKey: string;
  valueKey: string;
  limit?: number;
}) {
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const value = toNumber(row[valueKey]);
    if (!value) return;

    const group = normalizeGroupLabel(row[groupKey]);
    totals.set(group, (totals.get(group) ?? 0) + value);
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      value,
      formattedValue: formatMoney(value),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function makeInsightRows(items: Array<{ label: string; value: number; helper?: string }>) {
  return items.map((item) => ({
    ...item,
    formattedValue: formatMoney(item.value),
  }));
}

export function getTaskQuantityTotals(limit = 12) {
  const rows = getTableRows("Elszám részletező", "Táblázat28");
  const ignored = new Set([
    "_excelRow",
    "Ügyfél",
    "Cím",
    "Dátum",
    "Munkadíj(fő)",
    "Munkadíj(óra)",
  ]);

  const totals = new Map<string, number>();
  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (ignored.has(key)) return;
      const quantity = toNumber(value);
      if (!quantity) return;
      totals.set(key, (totals.get(key) ?? 0) + quantity);
    });
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function getClientStats() {
  const rows = getTableRows("Ügyfélnyilvántartás", "Táblázat30");
  const activeRows = rows.filter(
    (row) => toText(row["Aktív ügyfél?"]).toLowerCase() === "igen",
  );
  const flatRateRows = rows.filter(
    (row) => toText(row["Általány?"]).toLowerCase() === "igen",
  );
  const monthlyRows = rows.filter(
    (row) => toText(row["Minden hónapban?"]).toLowerCase() === "igen",
  );

  return {
    total: rows.length,
    active: activeRows.length,
    flatRate: flatRateRows.length,
    monthly: monthlyRows.length,
    revenue2026: sumRows(rows, "2026-ban össz bevétel"),
  };
}

export function getModuleInsight(moduleKey: string): ModuleInsight | null {
  if (moduleKey === "bevetelek") {
    const rows = getTableRows("Bevételek", "Income");
    const total = sumRows(rows, "Bevétel");
    const paid = rows
      .filter((row) => toText(row["Fizetve"]).toLowerCase() === "ok")
      .reduce((sum, row) => sum + toNumber(row["Bevétel"]), 0);
    const cash = rows
      .filter((row) => toText(row["Fizetés  módja"]).toLowerCase() === "kp")
      .reduce((sum, row) => sum + toNumber(row["Bevétel"]), 0);
    const transfer = rows
      .filter((row) => toText(row["Fizetés  módja"]).toLowerCase().includes("utal"))
      .reduce((sum, row) => sum + toNumber(row["Bevétel"]), 0);

    return {
      title: "Bevételi bontás",
      description:
        "Megmutatja, miből áll össze a bevétel: fizetett, készpénzes, utalásos és nyitott tételek.",
      rows: makeInsightRows([
        { label: "Összes bevétel", value: total, helper: `${rows.length} bevételi sor` },
        { label: "Fizetett", value: paid, helper: "Fizetve = ok" },
        { label: "Készpénz", value: cash, helper: "kp fizetési mód" },
        { label: "Utalás", value: transfer, helper: "utalásos fizetés" },
        { label: "Nyitott", value: Math.max(total - paid, 0), helper: "még nem ok" },
      ]),
    };
  }

  if (moduleKey === "kiadasok") {
    const rows = getTableRows("Kiadások", "OperatingExpenses");
    const total = sumRows(rows, "Bruttó Kiadás");
    const vat = sumRows(rows, "Áfa");
    const mk = rows
      .filter((row) => toText(row["Típus"]).toUpperCase() === "MK")
      .reduce((sum, row) => sum + toNumber(row["Bruttó Kiadás"]), 0);
    const uf = rows
      .filter((row) => toText(row["Típus"]).toUpperCase() === "ÜF")
      .reduce((sum, row) => sum + toNumber(row["Bruttó Kiadás"]), 0);
    const investment = rows
      .filter((row) => toText(row["Típus"]).toLowerCase().includes("beruh"))
      .reduce((sum, row) => sum + toNumber(row["Bruttó Kiadás"]), 0);

    return {
      title: "Kiadási bontás",
      description:
        "A fő kiadási csoportok külön látszanak, így gyorsan elválik a működés, ügyfélköltség és áfa.",
      rows: makeInsightRows([
        { label: "Összes bruttó kiadás", value: total, helper: `${rows.length} kiadási sor` },
        { label: "Működési költség", value: mk, helper: "MK típus" },
        { label: "Ügyfél kiadás", value: uf, helper: "ÜF típus" },
        { label: "Beruházás", value: investment, helper: "beruházás jellegű tétel" },
        { label: "Áfa", value: vat, helper: "Excel áfa oszlopból" },
      ]),
    };
  }

  if (moduleKey === "munkavallaloi-koltsegek") {
    const rows = getTableRows("Munkavállalói_költségek", "PersonnelExpenses");
    const total = sumRows(rows, "Kiadás");
    const wage = sumRows(rows, "Fizetés / összeg");
    const overtime = sumRows(rows, "Túlóra");
    const bonus = sumRows(rows, "Bónusz");
    const custom = sumRows(rows, "Egyéni összeg");

    return {
      title: "Dolgozói költség bontás",
      description:
        "A bér, túlóra, bónusz és egyéni összeg külön látszik, így követhető a havi munkaerőköltség.",
      rows: makeInsightRows([
        { label: "Összes dolgozói kiadás", value: total, helper: `${rows.length} bérsor` },
        { label: "Alap fizetés", value: wage, helper: "Fizetés / összeg" },
        { label: "Túlóra", value: overtime, helper: "Túlóra oszlop" },
        { label: "Bónusz", value: bonus, helper: "Bónusz oszlop" },
        { label: "Egyéni összeg", value: custom, helper: "plusz tételek" },
      ]),
    };
  }

  if (moduleKey === "elszamolas-reszletezo") {
    const rows = getTableRows("Elszám részletező", "Táblázat28");
    const crewHours = rows.reduce(
      (sum, row) => sum + toNumber(row["Munkadíj(fő)"]) * toNumber(row["Munkadíj(óra)"]),
      0,
    );
    const laborFee = crewHours * 8000;
    const taskTotals = getTaskQuantityTotals(4).map((item) => ({
      ...item,
      formattedValue: formatNumber(item.value),
    }));

    return {
      title: "Elszámolási kalkuláció",
      description:
        "A napi munkalapokból becsült csapatóra és munkadíj, plusz a leggyakoribb anyagmennyiségek.",
      rows: [
        {
          label: "Csapatóra",
          value: crewHours,
          formattedValue: `${formatNumber(crewHours)} óra`,
          helper: "fő x óra alapján",
        },
        {
          label: "Becsült munkadíj",
          value: laborFee,
          formattedValue: formatMoney(laborFee),
          helper: "csapatóra x 8000 Ft",
        },
        ...taskTotals,
      ],
    };
  }

  if (moduleKey === "fizetesek" || moduleKey === "teli-penzek") {
    const sheetName = moduleKey === "fizetesek" ? "Fizetések" : "Téli pénzek";
    const rows = getAllSheetRows(sheetName);
    const total = sumRows(rows, "Összesen");
    const paidUnits = sumRows(rows, "Db");

    return {
      title: moduleKey === "fizetesek" ? "Fizetési összesítő" : "Téli pénz összesítő",
      description:
        "A dolgozói táblák összesített sorai alapján gyors ellenőrző nézet.",
      rows: makeInsightRows([
        { label: "Összesen", value: total, helper: "összes dolgozói blokk együtt" },
        { label: "Darab / hónap összesen", value: paidUnits, helper: "Db oszlop összege" },
      ]),
    };
  }

  if (moduleKey === "ugyfelnyilvantartas") {
    const stats = getClientStats();

    return {
      title: "Ügyfélállomány",
      description:
        "Az ügyfelek üzleti állapota: aktív, általányos és havi rendszerességű partnerek.",
      rows: [
        {
          label: "Összes ügyfél",
          value: stats.total,
          formattedValue: String(stats.total),
        },
        {
          label: "Aktív ügyfél",
          value: stats.active,
          formattedValue: String(stats.active),
        },
        {
          label: "Általányos ügyfél",
          value: stats.flatRate,
          formattedValue: String(stats.flatRate),
        },
        {
          label: "Havi ügyfél",
          value: stats.monthly,
          formattedValue: String(stats.monthly),
        },
        {
          label: "2026 bevétel",
          value: stats.revenue2026,
          formattedValue: formatMoney(stats.revenue2026),
        },
      ],
    };
  }

  return null;
}

export function getModuleTopGroups(moduleKey: string) {
  if (moduleKey === "bevetelek") {
    return {
      title: "Legnagyobb bevétel ügyfelenként",
      rows: groupSum({
        rows: getTableRows("Bevételek", "Income"),
        groupKey: "Ügyfél",
        valueKey: "Bevétel",
        limit: 8,
      }),
    };
  }

  if (moduleKey === "kiadasok") {
    return {
      title: "Legnagyobb kiadás szállítónként",
      rows: groupSum({
        rows: getTableRows("Kiadások", "OperatingExpenses"),
        groupKey: "Megnevezés",
        valueKey: "Bruttó Kiadás",
        limit: 8,
      }),
    };
  }

  if (moduleKey === "munkavallaloi-koltsegek") {
    return {
      title: "Dolgozói kiadás személyenként",
      rows: groupSum({
        rows: getTableRows("Munkavállalói_költségek", "PersonnelExpenses"),
        groupKey: "Megnevezés",
        valueKey: "Kiadás",
        limit: 8,
      }),
    };
  }

  return null;
}

export function getWorkbookOverviewCards(): SummaryCard[] {
  const monthlyRows = getBudgetMonthlyRows();
  const incomeRows = getTableRows("Bevételek", "Income");
  const expenseRows = getTableRows("Kiadások", "OperatingExpenses");
  const personnelRows = getTableRows("Munkavállalói_költségek", "PersonnelExpenses");
  const clientStats = getClientStats();

  const revenue = monthlyRows.reduce((sum, row) => sum + row.revenue, 0);
  const expenses = monthlyRows.reduce((sum, row) => sum + row.expenses, 0);
  const profit = monthlyRows.reduce((sum, row) => sum + row.profit, 0);
  const unpaid = monthlyRows.reduce((sum, row) => sum + row.unpaid, 0);
  const jobs = monthlyRows.reduce((sum, row) => sum + row.jobs, 0);

  return [
    {
      label: "Éves bevétel",
      value: formatMoney(revenue),
      note: `${incomeRows.length} bevételi sorból és havi összesítőből`,
    },
    {
      label: "Éves kiadás",
      value: formatMoney(expenses),
      note: `${expenseRows.length} kiadási sor + ${personnelRows.length} bérköltség sor`,
    },
    {
      label: "Eredmény",
      value: formatMoney(profit),
      note: "Bevétel mínusz összes kiadás",
    },
    {
      label: "Kintlévőség",
      value: formatMoney(unpaid),
      note: "Nem fizetett bevétel havi összesítő alapján",
    },
    {
      label: "Munkák száma",
      value: formatNumber(jobs),
      note: "Napi és havi terheléshez",
    },
    {
      label: "Aktív ügyfelek",
      value: String(clientStats.active),
      note: `${clientStats.total} ügyfélből, ${clientStats.monthly} havi ügyfél`,
    },
  ];
}

export function getOperationalDashboard(): OperationalDashboard {
  const monthlyRows = getBudgetMonthlyRows();
  const incomeRows = getTableRows("Bevételek", "Income");
  const dailyRevenueMap = new Map<string, DailyRevenueRow>();
  const enrichedMonthlyRows = monthlyRows.map((row) => ({
    ...row,
    averageRevenuePerWorkday: row.workdays ? row.revenue / row.workdays : 0,
    profitMargin: row.revenue ? row.profit / row.revenue : 0,
  }));
  const populatedMonths = monthlyRows.filter(
    (row) => row.revenue || row.expenses || row.profit || row.jobs,
  );
  const recentIncomeRows = [...incomeRows]
    .filter((row) => toDate(row["Dátum"]))
    .sort((a, b) => {
      const dateA = toDate(a["Dátum"])?.getTime() ?? 0;
      const dateB = toDate(b["Dátum"])?.getTime() ?? 0;
      return dateB - dateA;
    })
    .slice(0, 6);
  incomeRows.forEach((row) => {
    const date = formatDateKey(row["Dátum"]);
    if (!date) return;

    const revenue = toNumber(row["Bevétel"]);
    const isPaid = toText(row["Fizetve"]).toLowerCase() === "ok";
    const current = dailyRevenueMap.get(date) ?? {
      date,
      revenue: 0,
      paid: 0,
      unpaid: 0,
      rows: 0,
    };

    current.revenue += revenue;
    current.paid += isPaid ? revenue : 0;
    current.unpaid += isPaid ? 0 : revenue;
    current.rows += 1;
    dailyRevenueMap.set(date, current);
  });

  const dailyRevenueRows = Array.from(dailyRevenueMap.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const latestIncomeDate = toDate(recentIncomeRows[0]?.["Dátum"]);
  const monthIndex = latestIncomeDate ? latestIncomeDate.getMonth() : -1;
  const activeMonth =
    monthIndex >= 0
      ? (monthlyRows.find((row) => row.month === monthNames[monthIndex]) ?? null)
      : (populatedMonths.at(-1) ?? null);
  const bestMonth =
    populatedMonths.length > 0
      ? populatedMonths.reduce((best, row) => (row.profit > best.profit ? row : best))
      : null;
  const weakestMonth =
    populatedMonths.length > 0
      ? populatedMonths.reduce((weakest, row) =>
          row.profit < weakest.profit ? row : weakest,
        )
      : null;

  const activeRevenue = activeMonth?.revenue ?? 0;
  const activeExpenses = activeMonth?.expenses ?? 0;
  const activeProfit = activeMonth?.profit ?? 0;
  const activeWorkdays = activeMonth?.workdays ?? 0;
  const activeUnpaid = activeMonth?.unpaid ?? 0;
  const settlementRows = getTableRows("Elszám részletező", "Táblázat28");
  const crewHours = settlementRows.reduce(
    (sum, row) => sum + toNumber(row["Munkadíj(fő)"]) * toNumber(row["Munkadíj(óra)"]),
    0,
  );
  const estimatedLaborFee = crewHours * 8000;
  const taskQuantityRows = getTaskQuantityTotals(6).map((item) => ({
    ...item,
    formattedValue: formatNumber(item.value),
    helper: "Elszámolás részletező alapján",
  }));

  return {
    activeMonth,
    bestMonth,
    weakestMonth,
    dailyRevenueRows,
    taskQuantityRows,
    recentIncomeRows,
    monthlyRows: enrichedMonthlyRows,
    cards: [
      {
        label: "Aktuális hónap",
        value: activeMonth?.month ?? "Nincs adat",
        note: activeMonth
          ? `${formatNumber(activeMonth.jobs)} munka, ${formatNumber(activeWorkdays)} munkanap`
          : "A bevételi dátumok alapján",
      },
      {
        label: "Havi bevétel",
        value: formatMoney(activeRevenue),
        note: "A költségvetés havi bontásából",
      },
      {
        label: "Havi kiadás",
        value: formatMoney(activeExpenses),
        note: "Munkabér + működés + ügyfélköltség + beruházás",
      },
      {
        label: "Havi eredmény",
        value: formatMoney(activeProfit),
        note: `Árrés: ${formatPercent(activeRevenue ? activeProfit / activeRevenue : 0)}`,
      },
      {
        label: "Napi átlagbevétel",
        value: formatMoney(activeWorkdays ? activeRevenue / activeWorkdays : 0),
        note: "Bevétel / munkanap",
      },
      {
        label: "Kintlévőség",
        value: formatMoney(activeUnpaid),
        note: "Még nem fizetett tételek az aktív hónapban",
      },
      {
        label: "Csapatóra",
        value: `${formatNumber(crewHours)} óra`,
        note: "Munkadíj fő x óra az elszámolás részletezőből",
      },
      {
        label: "Becsült munkadíj",
        value: formatMoney(estimatedLaborFee),
        note: "Csapatóra x 8000 Ft",
      },
    ],
  };
}

export function getModuleSummaryCards(sheetName: string): SummaryCard[] {
  const rows = getAllSheetRows(sheetName);
  const tables = getSheetTables(sheetName);
  const numericTotals = getNumericTotals(rows, 3);

  const cards: SummaryCard[] = [
    {
      label: "Adatsor",
      value: String(rows.length),
      note: `${tables.length} Excel táblából beolvasva`,
    },
  ];

  numericTotals.forEach((item) => {
    cards.push({
      label: item.label,
      value: formatMoney(item.value),
      note: "Excelből számolt összeg",
    });
  });

  return cards;
}

export function getModulePrimaryRows(sheetName: string, maxRows = 30) {
  const table = getSheetTables(sheetName).find((item) => item.rows.length > 0);

  if (!table) {
    return {
      tableName: "",
      headers: [] as string[],
      rows: [] as WorkbookRow[],
      totalRows: 0,
    };
  }

  return {
    tableName: table.name,
    headers: table.headers,
    rows: table.rows.slice(0, maxRows) as WorkbookRow[],
    totalRows: table.rows.length,
  };
}
