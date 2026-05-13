import Link from "next/link";

import { budgetModules } from "@/app/app/budgetModules";
import {
  formatMoney,
  formatPercent,
  getOperationalDashboard,
  getWorkbookOverviewCards,
} from "@/lib/budget/analytics";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

const text = {
  eyebrow: "KAP k\u00f6zpont",
  title: "Egyszer\u0171 c\u00e9ges ir\u00e1ny\u00edt\u00f3fel\u00fclet.",
  subtitle:
    "H\u00e1rom f\u0151 r\u00e9sz: k\u00f6lts\u00e9gvet\u00e9s, \u00e1raj\u00e1nlat \u00e9s \u00fcgyfelek.",
  mainModule: "F\u0151 modul",
  budget: "K\u00f6lts\u00e9gvet\u00e9s",
  separateModule: "K\u00fcl\u00f6n modul",
  quote: "\u00c1raj\u00e1nlat",
  clients: "\u00dcgyfelek",
  open: "Lenyit\u00e1s",
  survey: "Felm\u00e9r\u0151 \u0171rlap",
  quotes: "Aj\u00e1nlatok",
  priceList: "\u00c1rlista",
  clientList: "\u00dcgyf\u00e9llista",
  operations: "Működési dashboard",
  operationsModule: "Napi működés",
  operationsTitle: "Napi, havi és éves pénzügyi állapot.",
  operationsSubtitle:
    "Ez már a költségvetési Excelből számol: bevétel, kiadás, profit, kintlévőség és havi teljesítmény.",
  dailyRevenue: "Napi bevételi bontás",
  dailyTasks: "Leggyakoribb napi munkák",
  recentRevenue: "Legutóbbi bevételek",
  monthCompare: "Havi összehasonlítás",
};

function formatShortDate(value: unknown) {
  if (typeof value !== "string") return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("hu-HU", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const overviewCards = getWorkbookOverviewCards();
  const dashboard = getOperationalDashboard();
  const profitTrend = [
    {
      label: "Legjobb hónap",
      month: dashboard.bestMonth?.month ?? "Nincs adat",
      value: dashboard.bestMonth ? formatMoney(dashboard.bestMonth.profit) : "-",
    },
    {
      label: "Leggyengébb hónap",
      month: dashboard.weakestMonth?.month ?? "Nincs adat",
      value: dashboard.weakestMonth ? formatMoney(dashboard.weakestMonth.profit) : "-",
    },
  ];

  return (
    <main className="flex w-full flex-1 flex-col gap-6">
      {params.message ? (
        <div className="rounded-[20px] border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold text-emerald-950">
          {params.message}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-[20px] border-2 border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold text-rose-950">
          {params.error}
        </div>
      ) : null}

      <section className="rounded-[30px] border-2 border-[#cdbda8] bg-[#fffaf3] p-6 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:p-8">
        <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
          {text.eyebrow}
        </p>
        <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#17130f] lg:text-5xl">
          {text.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-[#44382e]">
          {text.subtitle}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewCards.map((card) => (
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

      <section className="rounded-[30px] border-2 border-[#1e5a40] bg-[#10201a] p-5 text-white shadow-[0_18px_50px_rgba(10,20,17,0.22)] lg:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/50 bg-emerald-300/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
              {text.operations}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
              {text.operationsTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/72">
              {text.operationsSubtitle}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
              Aktív hónap
            </p>
            <p className="mt-2 text-2xl font-bold">
              {dashboard.activeMonth?.month ?? "Nincs adat"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.cards.map((card) => (
            <article
              key={card.label}
              className="rounded-[20px] border border-white/10 bg-white/8 p-4"
            >
              <p className="text-sm font-bold text-emerald-100">{card.label}</p>
              <p className="mt-2 break-words text-2xl font-bold">{card.value}</p>
              {card.note ? (
                <p className="mt-2 text-xs font-semibold leading-5 text-white/62">
                  {card.note}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
              <h3 className="text-xl font-bold">{text.dailyRevenue}</h3>
              <div className="mt-4 space-y-3">
                {dashboard.dailyRevenueRows.map((row) => (
                  <div
                    key={row.date}
                    className="rounded-[16px] border border-white/10 bg-[#f8efe2] px-4 py-3 text-[#17130f]"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-bold">
                        {new Intl.DateTimeFormat("hu-HU", {
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(`${row.date}T00:00:00`))}
                      </p>
                      <p className="font-bold text-[#1e5a40]">
                        {formatMoney(row.revenue)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#5f5144]">
                      {row.rows} sor · fizetett: {formatMoney(row.paid)} · nyitott:{" "}
                      {formatMoney(row.unpaid)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
              <h3 className="text-xl font-bold">{text.dailyTasks}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {dashboard.taskQuantityRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-[16px] border border-white/10 bg-[#f8efe2] px-4 py-3 text-[#17130f]"
                  >
                    <p className="text-sm font-bold">{row.label}</p>
                    <p className="mt-1 text-xl font-bold text-[#1e5a40]">
                      {row.formattedValue}
                    </p>
                    {row.helper ? (
                      <p className="mt-1 text-xs font-semibold text-[#5f5144]">
                        {row.helper}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
              <h3 className="text-xl font-bold">{text.recentRevenue}</h3>
              <div className="mt-4 space-y-3">
                {dashboard.recentIncomeRows.map((row) => (
                  <div
                    key={String(row._excelRow)}
                    className="rounded-[16px] border border-white/10 bg-[#f8efe2] px-4 py-3 text-[#17130f]"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-bold">
                        {String(row["Ügyfél"] ?? "Nincs ügyfél")}
                      </p>
                      <p className="font-bold text-[#1e5a40]">
                        {formatMoney(Number(row["Bevétel"] ?? 0))}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#5f5144]">
                      {formatShortDate(row["Dátum"])} · {String(row["Cím"] ?? "")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
            <h3 className="text-xl font-bold">{text.monthCompare}</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-emerald-100">
                  <tr>
                    <th className="px-3 py-2 font-bold">Hónap</th>
                    <th className="px-3 py-2 font-bold">Bevétel</th>
                    <th className="px-3 py-2 font-bold">Profit</th>
                    <th className="px-3 py-2 font-bold">Árrés</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.monthlyRows.map((row) => (
                    <tr key={row.month} className="border-t border-white/10">
                      <td className="px-3 py-2 font-bold">{row.month}</td>
                      <td className="px-3 py-2">{formatMoney(row.revenue)}</td>
                      <td
                        className={`px-3 py-2 font-bold ${
                          row.profit >= 0 ? "text-emerald-100" : "text-rose-200"
                        }`}
                      >
                        {formatMoney(row.profit)}
                      </td>
                      <td className="px-3 py-2">{formatPercent(row.profitMargin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {profitTrend.map((item) => (
                <div key={item.label} className="rounded-[16px] bg-white/8 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                    {item.label}
                  </p>
                  <p className="mt-2 font-bold">
                    {item.month}: {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-[28px] border-2 border-[#1e5a40] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            {text.separateModule}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#17130f]">
            {text.operationsModule}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-[#44382e]">
            Munkalap, bevétel és kiadás gyors napi rögzítése.
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href="/app/mukodes"
              className="rounded-[18px] border-2 border-[#1e5a40] bg-[#123f2d] px-4 py-4 text-white transition hover:bg-[#1d4d39]"
            >
              <p className="text-lg font-bold">Működés megnyitása</p>
            </Link>
          </div>
        </section>

        <details
          open
          name="kap-main-modules"
          className="group rounded-[28px] border-2 border-[#1e5a40] bg-[#0d241b] p-5 text-white shadow-[0_18px_50px_rgba(10,20,17,0.22)]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                {text.mainModule}
              </p>
              <h2 className="mt-2 text-3xl font-bold">{text.budget}</h2>
            </div>
            <span className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-bold text-[#0b1a16]">
              {text.open}
            </span>
          </summary>

          <div className="mt-6 grid gap-3">
            {budgetModules.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="rounded-[18px] border border-white/10 bg-white/8 px-4 py-4 transition hover:bg-white/14"
              >
                <p className="text-lg font-bold">{module.title}</p>
              </Link>
            ))}
          </div>
        </details>

        <details
          name="kap-main-modules"
          className="group rounded-[28px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
                {text.separateModule}
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#17130f]">{text.quote}</h2>
            </div>
            <span className="rounded-full border-2 border-[#bfa988] px-4 py-2 text-sm font-bold text-[#1f1a15]">
              {text.open}
            </span>
          </summary>

          <div className="mt-6 grid gap-3">
            <Link
              href="/felmero"
              className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40]"
            >
              <p className="text-lg font-bold text-[#17130f]">{text.survey}</p>
            </Link>
            <Link
              href="/app/ajanlatok"
              className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40]"
            >
              <p className="text-lg font-bold text-[#17130f]">{text.quotes}</p>
            </Link>
            <Link
              href="/app/arlista"
              className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40]"
            >
              <p className="text-lg font-bold text-[#17130f]">{text.priceList}</p>
            </Link>
          </div>
        </details>

        <section className="rounded-[28px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            {text.separateModule}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#17130f]">{text.clients}</h2>

          <div className="mt-6 grid gap-3">
            <Link
              href="/app/ugyfelek"
              className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40]"
            >
              <p className="text-lg font-bold text-[#17130f]">{text.clientList}</p>
            </Link>
            <Link
              href="/app/ugyfelnyilvantartas"
              className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40]"
            >
              <p className="text-lg font-bold text-[#17130f]">
                {"\u00dcgyf\u00e9lnyilv\u00e1ntart\u00e1s"}
              </p>
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
