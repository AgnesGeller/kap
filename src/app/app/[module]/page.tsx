import Link from "next/link";
import { notFound } from "next/navigation";

import { budgetModules, type BudgetModuleKey } from "@/app/app/budgetModules";
import {
  formatMoney,
  formatNumber,
  getBudgetMonthlyRows,
  getClientStats,
  getModuleInsight,
  getModulePrimaryRows,
  getModuleSummaryCards,
  getModuleTopGroups,
  getNumericTotals,
  getTaskQuantityTotals,
  getWorkbookOverviewCards,
} from "@/lib/budget/analytics";
import { getSheetDataSummary, getWorkbookSheet } from "@/lib/budget/workbookData";

type PageProps = {
  params: Promise<{
    module: string;
  }>;
};

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

  return String(value ?? "");
}

export default async function BudgetModulePage({ params }: PageProps) {
  const { module } = await params;
  const currentModule = budgetModules.find(
    (item) => item.key === (module as BudgetModuleKey),
  );

  if (!currentModule) {
    notFound();
  }

  const workbookSheet = getWorkbookSheet(currentModule.sheetName);
  const dataSummary = getSheetDataSummary(currentModule.sheetName);
  const primaryTable = getModulePrimaryRows(currentModule.sheetName);
  const summaryCards =
    currentModule.key === "koltsegvetes"
      ? getWorkbookOverviewCards()
      : getModuleSummaryCards(currentModule.sheetName);
  const numericTotals = getNumericTotals(
    workbookSheet?.tables.flatMap((table) => table.rows) ?? [],
    8,
  );
  const monthlyRows = getBudgetMonthlyRows();
  const taskTotals =
    currentModule.key === "elszamolas-reszletezo" ? getTaskQuantityTotals() : [];
  const clientStats =
    currentModule.key === "ugyfelnyilvantartas" ? getClientStats() : null;
  const insight = getModuleInsight(currentModule.key);
  const topGroups = getModuleTopGroups(currentModule.key);
  const visibleHeaders = primaryTable.headers.slice(0, 8);

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

      <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
        <h2 className="text-2xl font-bold text-[#17130f]">Importált adatállapot</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["Sor", dataSummary.rowCount],
            ["Tábla", dataSummary.tableCount],
            ["Adatsor", dataSummary.tableRowCount],
            ["Képlet", dataSummary.formulaCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[18px] bg-[#fff8ee] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
                {label}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#17130f]">{value}</p>
            </div>
          ))}
        </div>

        {numericTotals.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {numericTotals.map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-[#e3d8c8] bg-white px-4 py-4"
              >
                <p className="text-sm font-bold text-[#493b2f]">{item.label}</p>
                <p className="mt-2 text-lg font-bold text-[#17130f]">
                  {formatMoney(item.value)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {primaryTable.rows.length ? (
        <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
                Excel adat
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
                {primaryTable.tableName}
              </h2>
            </div>
            <p className="rounded-full border border-[#d3c3ad] bg-[#fff8ee] px-4 py-2 text-sm font-bold text-[#493b2f]">
              {primaryTable.rows.length} / {primaryTable.totalRows} sor előnézet
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fff8ee] text-[#493b2f]">
                <tr>
                  {visibleHeaders.map((header) => (
                    <th key={header} className="px-4 py-3 font-bold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {primaryTable.rows.map((row) => (
                  <tr key={String(row._excelRow)} className="border-t border-[#eadfce]">
                    {visibleHeaders.map((header) => (
                      <td key={header} className="max-w-[260px] px-4 py-3 text-[#44382e]">
                        {formatCellValue(row[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
        <h2 className="text-2xl font-bold text-[#17130f]">Számítási logika</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {currentModule.calculations.map((calculation) => (
            <div
              key={calculation}
              className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 text-sm font-bold leading-7 text-[#2a211a]"
            >
              {calculation}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
