import Link from "next/link";

import { withTimeout } from "@/lib/async";
import { createQueryTimeoutResponse } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type QuoteRow = {
  id: string;
  title: string;
  status: string | null;
  total: number | null;
  created_at: string | null;
  survey_id: string | null;
};

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "Nincs adat";

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: string | null) {
  switch (status) {
    case "draft":
      return "Vázlat";
    case "sent":
      return "Elküldve";
    case "accepted":
      return "Elfogadva";
    case "rejected":
      return "Elutasítva";
    case "archived":
      return "Archivált";
    default:
      return "Ismeretlen";
  }
}

export default async function QuotesPage() {
  const supabase = await createClient();

  const { data: quotes, error } = await withTimeout(
    supabase
      .from("quotes")
      .select("id, title, status, total, created_at, survey_id")
      .order("created_at", { ascending: false })
      .limit(50),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  const quoteRows = (quotes ?? []) as QuoteRow[];
  const draftCount = quoteRows.filter((quote) => quote.status === "draft").length;
  const totalValue = quoteRows.reduce((sum, quote) => sum + (quote.total ?? 0), 0);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            Ajánlatok
          </h1>
        </div>
        <Link
          href="/app"
          className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza az adminhoz
        </Link>
      </div>

      {error ? (
        <div className="rounded-[20px] border-2 border-amber-300 bg-amber-50 px-5 py-4 text-base font-semibold leading-7 text-amber-950">
          Az ajánlatlista még nem olvasható a Supabase-ből. Hiba: {error.message}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Ajánlatok száma</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{quoteRows.length}</p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Vázlatok</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{draftCount}</p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Összesített érték</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">
            {formatMoney(totalValue)}
          </p>
        </article>
      </section>

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
          Lista
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
          Mentett ajánlat vázlatok
        </h2>

        {quoteRows.length ? (
          <div className="mt-5 grid gap-3">
            {quoteRows.map((quote) => (
              <Link
                href={`/app/ajanlatok/${quote.id}`}
                key={quote.id}
                className="grid gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <div>
                  <p className="text-base font-bold text-[#17130f]">{quote.title}</p>
                  <p className="mt-1 text-sm font-semibold text-[#44382e]">
                    Létrehozva: {formatDate(quote.created_at)}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-[#123f2d]">
                  {formatStatus(quote.status)}
                </span>
                <div className="text-lg font-bold text-[#17130f]">
                  {formatMoney(quote.total)}
                </div>
                {quote.survey_id ? (
                  <span className="md:col-span-3 w-fit rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white">
                    Adatlap megnyitása
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-5 text-base font-medium leading-8 text-[#44382e]">
            Még nincs ajánlat vázlat. Nyiss meg egy mentett felmérést, és ott
            kattints az ajánlat vázlat létrehozására.
          </div>
        )}
      </section>
    </main>
  );
}
