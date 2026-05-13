import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteEditor } from "@/app/app/ajanlatok/[id]/QuoteEditor";
import { updateQuote } from "@/app/app/ajanlatok/[id]/actions";
import { withTimeout } from "@/lib/async";
import { createQueryTimeoutResponse } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type QuoteDetail = {
  id: string;
  survey_id: string | null;
  client_id: string | null;
  quote_number: string | null;
  title: string;
  status: string | null;
  line_items: unknown;
  subtotal: number | null;
  vat_rate: number | null;
  total: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type SurveyRow = {
  id: string;
  title: string | null;
  site_address: string | null;
  settlement: string | null;
};

type QuoteLineItem = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note: string;
};

type PriceItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  unit_price: number | null;
  vat_rate: number | null;
};

const quoteStatuses = [
  { value: "draft", label: "Vázlat" },
  { value: "sent", label: "Elküldve" },
  { value: "accepted", label: "Elfogadva" },
  { value: "rejected", label: "Elutasítva" },
  { value: "archived", label: "Archivált" },
];

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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: string | null) {
  return quoteStatuses.find((option) => option.value === status)?.label ?? "Ismeretlen";
}

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function normalizeLineItems(value: unknown): QuoteLineItem[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const quantity = readNumber(row.quantity) || 1;
    const unitPrice = readNumber(row.unitPrice);
    const total = readNumber(row.total) || Math.round(quantity * unitPrice);

    return {
      name: readText(row.name),
      quantity,
      unit: readText(row.unit) || "db",
      unitPrice,
      total,
      note: readText(row.note),
    };
  });
}

export default async function QuoteDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const paramsValue = (await searchParams) ?? {};
  const supabase = await createClient();

  const { data: quote, error } = await withTimeout(
    supabase
      .from("quotes")
      .select(
        "id, survey_id, client_id, quote_number, title, status, line_items, subtotal, vat_rate, total, notes, created_at, updated_at",
      )
      .eq("id", id)
      .single(),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  if (error || !quote) {
    notFound();
  }

  const quoteDetail = quote as QuoteDetail;

  const { data: client } = quoteDetail.client_id
    ? await withTimeout(
        supabase
          .from("clients")
          .select("id, name, email, phone")
          .eq("id", quoteDetail.client_id)
          .single(),
        createQueryTimeoutResponse("Az ügyfél nem tölthető be."),
        6000,
      )
    : { data: null };

  const { data: survey } = quoteDetail.survey_id
    ? await withTimeout(
        supabase
          .from("site_surveys")
          .select("id, title, site_address, settlement")
          .eq("id", quoteDetail.survey_id)
          .single(),
        createQueryTimeoutResponse("A felmérés nem tölthető be."),
        6000,
      )
    : { data: null };

  const { data: priceItems } = await withTimeout(
    supabase
      .from("price_items")
      .select("id, name, category, unit, unit_price, vat_rate")
      .eq("status", "active")
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(80),
    {
      data: [] as PriceItem[],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
      success: true as const,
    },
    6000,
  );

  const clientRow = client as ClientRow | null;
  const surveyRow = survey as SurveyRow | null;
  const priceItemRows = (priceItems ?? []) as PriceItem[];
  const lineItems = normalizeLineItems(quoteDetail.line_items);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app/ajanlatok"
          className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza az ajánlatokhoz
        </Link>
        {quoteDetail.survey_id ? (
          <Link
            href={`/app/felmeresek/${quoteDetail.survey_id}`}
            className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
          >
            Felmérés megnyitása
          </Link>
        ) : null}
        {quoteDetail.client_id ? (
          <Link
            href={`/app/ugyfelek/${quoteDetail.client_id}`}
            className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
          >
            Ügyfél megnyitása
          </Link>
        ) : null}
        <Link
          href={`/app/ajanlatok/${quoteDetail.id}/nyomtatas`}
          className="inline-flex rounded-full bg-emerald-300 px-5 py-3 text-sm font-bold text-[#0b1a16] shadow-[0_10px_24px_rgba(5,15,12,0.16)] transition hover:bg-emerald-200"
        >
          Nyomtatási nézet
        </Link>
      </div>

      {paramsValue.message ? (
        <div className="rounded-[20px] border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold leading-7 text-emerald-950">
          {paramsValue.message}
        </div>
      ) : null}

      {paramsValue.error ? (
        <div className="rounded-[20px] border-2 border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold leading-7 text-rose-950">
          {paramsValue.error}
        </div>
      ) : null}

      <section className="grid gap-5 rounded-[26px] border-2 border-[#cdbda8] bg-[#fffaf3] p-5 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Ajánlat adatlap
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            {quoteDetail.title}
          </h1>
          <p className="mt-3 inline-flex rounded-full border border-[#d3c3ad] bg-white px-4 py-2 text-sm font-bold text-[#2a211a]">
            Ajánlatszám: {quoteDetail.quote_number || "nincs megadva"}
          </p>
          <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[#44382e]">
            {surveyRow
              ? [surveyRow.settlement, surveyRow.site_address].filter(Boolean).join(" - ")
              : "Nincs kapcsolt felmérési helyszín"}
          </p>
        </div>

        <div className="rounded-[24px] bg-[#0d241b] p-5 text-white shadow-[0_16px_44px_rgba(10,20,17,0.28)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                Státusz
              </p>
              <p className="mt-2 text-2xl font-bold">{formatStatus(quoteDetail.status)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                Végösszeg
              </p>
              <p className="mt-2 text-2xl font-bold">{formatMoney(quoteDetail.total)}</p>
            </div>
          </div>
          <p className="mt-5 rounded-[18px] border border-white/14 bg-white/8 px-4 py-4 text-sm font-semibold leading-7 text-white">
            Létrehozva: {formatDate(quoteDetail.created_at)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 rounded-[24px] border-2 border-emerald-200 bg-emerald-50 p-5 shadow-[0_14px_36px_rgba(26,20,16,0.05)] md:grid-cols-3">
        <article>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
            Ügyfélnek adható állapot
          </p>
          <p className="mt-2 text-2xl font-bold text-[#17130f]">
            {formatStatus(quoteDetail.status)}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#244f3c]">
            Ha minden tétel és összeg rendben van, nyisd meg a nyomtatási nézetet.
          </p>
        </article>
        <article>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
            Tételsorok
          </p>
          <p className="mt-2 text-2xl font-bold text-[#17130f]">
            {lineItems.length} db
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#244f3c]">
            Az ajánlati tételek a nyomtatható oldalon is megjelennek.
          </p>
        </article>
        <article>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
            PDF / nyomtatás
          </p>
          <Link
            href={`/app/ajanlatok/${quoteDetail.id}/nyomtatas`}
            className="mt-3 inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
          >
            Ügyfél nézet megnyitása
          </Link>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Kapcsolat
          </p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
                Ügyfél
              </p>
              <p className="mt-2 text-base font-semibold text-[#17130f]">
                {clientRow?.name || "Nincs kapcsolt ügyfél"}
              </p>
              <p className="mt-1 text-sm font-medium text-[#44382e]">
                {[clientRow?.email, clientRow?.phone].filter(Boolean).join(" | ") ||
                  "Nincs elérhetőség"}
              </p>
            </div>
            <div className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
                Felmérés
              </p>
              <p className="mt-2 text-base font-semibold text-[#17130f]">
                {surveyRow?.title || "Nincs kapcsolt felmérés"}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Ajánlat szerkesztése
          </p>
          <QuoteEditor
            quoteId={quoteDetail.id}
            quoteNumber={quoteDetail.quote_number ?? ""}
            title={quoteDetail.title}
            status={quoteDetail.status ?? "draft"}
            subtotal={quoteDetail.subtotal ?? 0}
            vatRate={quoteDetail.vat_rate ?? 27}
            notes={quoteDetail.notes ?? ""}
            lineItems={lineItems}
            priceItems={priceItemRows}
            statuses={quoteStatuses}
            action={updateQuote}
          />
        </article>
      </section>

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
          Tételek vázlata
        </p>
        {lineItems.length ? (
          <div className="mt-5 grid gap-3">
            {lineItems.map((item, index) => (
              <article
                key={index}
                className="grid gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-base font-bold text-[#17130f]">
                    {item.name || `Tétel ${index + 1}`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#44382e]">
                    {item.quantity} {item.unit} x {formatMoney(item.unitPrice)}
                  </p>
                  {item.note ? (
                    <p className="mt-2 text-sm font-medium leading-6 text-[#44382e]">
                      {item.note}
                    </p>
                  ) : null}
                </div>
                <p className="text-lg font-bold text-[#17130f]">
                  {formatMoney(item.total)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-4 text-base font-medium leading-8 text-[#44382e]">
            Még nincs tétel az ajánlatban.
          </p>
        )}
      </section>
    </main>
  );
}
