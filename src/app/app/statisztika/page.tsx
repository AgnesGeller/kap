import Link from "next/link";

import {
  formatMoney,
  formatNumber,
  formatPercent,
  getOperationalDashboard,
} from "@/lib/budget/analytics";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

export default function StatisticsPage() {
  const dashboard = getOperationalDashboard();

  return (
    <main className="flex w-full flex-1 flex-col gap-5">
      <section className="rounded-[30px] border-2 border-[#cdbda8] bg-[#fffaf3] p-6 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
              Statisztika
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#17130f] lg:text-5xl">
              Napi, havi és éves kimutatások.
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-[#44382e]">
              A pénzügyi összesítők külön oldalon vannak, hogy a központ és a
              munkalap gyors és diszkrét maradjon.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex w-fit rounded-full border-2 border-[#bfa988] bg-white px-6 py-3 text-base font-bold text-[#1f1a15] transition hover:border-[#1e5a40] hover:bg-[#f6efe5]"
          >
            Vissza a központba
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.cards.map((card) => (
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

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <h2 className="text-2xl font-bold text-[#17130f]">Havi bontás</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[#674b25]">
                <tr>
                  <th className="px-3 py-2 font-bold">Hónap</th>
                  <th className="px-3 py-2 font-bold">Bevétel</th>
                  <th className="px-3 py-2 font-bold">Kiadás</th>
                  <th className="px-3 py-2 font-bold">Eredmény</th>
                  <th className="px-3 py-2 font-bold">Árrés</th>
                  <th className="px-3 py-2 font-bold">Munkák</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.monthlyRows.map((row) => (
                  <tr key={row.month} className="border-t border-[#eadfce]">
                    <td className="px-3 py-3 font-bold">{row.month}</td>
                    <td className="px-3 py-3">{formatMoney(row.revenue)}</td>
                    <td className="px-3 py-3">{formatMoney(row.expenses)}</td>
                    <td className="px-3 py-3 font-bold text-[#1e5a40]">
                      {formatMoney(row.profit)}
                    </td>
                    <td className="px-3 py-3">{formatPercent(row.profitMargin)}</td>
                    <td className="px-3 py-3">{formatNumber(row.jobs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="grid gap-5">
          <article className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
            <h2 className="text-2xl font-bold text-[#17130f]">Napi bevétel</h2>
            <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-2">
              {dashboard.dailyRevenueRows.map((row) => (
                <div
                  key={row.date}
                  className="rounded-[18px] border border-[#eadfce] bg-[#fff8ee] px-4 py-3"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-bold text-[#17130f]">{formatDate(row.date)}</p>
                    <p className="font-bold text-[#1e5a40]">
                      {formatMoney(row.revenue)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#5f5144]">
                    {row.rows} sor, fizetett: {formatMoney(row.paid)}, nyitott:{" "}
                    {formatMoney(row.unpaid)}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[26px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
            <h2 className="text-2xl font-bold text-[#17130f]">
              Anyag- és munkatétel fogyás
            </h2>
            <div className="mt-4 grid gap-3">
              {dashboard.taskQuantityRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-[18px] border border-[#eadfce] bg-[#fff8ee] px-4 py-3"
                >
                  <p className="text-sm font-bold text-[#17130f]">{row.label}</p>
                  <p className="mt-1 text-xl font-bold text-[#1e5a40]">
                    {row.formattedValue}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
