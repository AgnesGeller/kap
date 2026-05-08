import Link from "next/link";
import { notFound } from "next/navigation";

import { withTimeout } from "@/lib/async";
import { createQueryTimeoutResponse } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
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
};

type ClientRow = {
  name: string;
  email: string | null;
  phone: string | null;
  project_address: string | null;
  billing_address: string | null;
};

type SurveyRow = {
  title: string | null;
  site_address: string | null;
  settlement: string | null;
  postal_code: string | null;
  project_goal: string | null;
};

type QuoteLineItem = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note: string;
};

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

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "Nincs dátum";

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
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

export default async function PrintableQuotePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote, error } = await withTimeout(
    supabase
      .from("quotes")
      .select(
        "id, survey_id, client_id, quote_number, title, status, line_items, subtotal, vat_rate, total, notes, created_at",
      )
      .eq("id", id)
      .single(),
    createQueryTimeoutResponse("Az ajánlat nem tölthető be."),
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
          .select("name, email, phone, project_address, billing_address")
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
          .select("title, site_address, settlement, postal_code, project_goal")
          .eq("id", quoteDetail.survey_id)
          .single(),
        createQueryTimeoutResponse("A felmérés nem tölthető be."),
        6000,
      )
    : { data: null };

  const clientRow = client as ClientRow | null;
  const surveyRow = survey as SurveyRow | null;
  const lineItems = normalizeLineItems(quoteDetail.line_items);

  return (
    <main className="min-h-screen bg-[#f5efe5] px-4 py-6 text-[#17130f] print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/app/ajanlatok/${quoteDetail.id}`}
            className="rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15]"
          >
            Vissza az ajánlathoz
          </Link>
          <p className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white">
            Nyomtatás vagy Mentés PDF-be: Ctrl + P
          </p>
        </div>

        <section className="rounded-[28px] border-2 border-[#d3c3ad] bg-white p-7 shadow-[0_18px_50px_rgba(26,20,16,0.08)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[#e7dccd] pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#674b25]">
                KAP ajánlat
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                {quoteDetail.title}
              </h1>
              <p className="mt-3 text-base font-semibold text-[#493b2f]">
                Kelt: {formatDate(quoteDetail.created_at)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#d3c3ad] bg-[#fff8ee] px-4 py-2 text-sm font-bold text-[#2a211a]">
                  Ajánlatszám: {quoteDetail.quote_number || "nincs megadva"}
                </span>
                <span className="rounded-full border border-[#d3c3ad] bg-[#fff8ee] px-4 py-2 text-sm font-bold text-[#2a211a]">
                  Státusz: {formatStatus(quoteDetail.status)}
                </span>
                <span className="rounded-full border border-[#d3c3ad] bg-[#fff8ee] px-4 py-2 text-sm font-bold text-[#2a211a]">
                  Érvényesség: egyeztetés szerint
                </span>
              </div>
            </div>
            <div className="rounded-[22px] bg-[#0d241b] px-5 py-4 text-right text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                Végösszeg
              </p>
              <p className="mt-2 text-3xl font-bold">{formatMoney(quoteDetail.total)}</p>
            </div>
          </header>

          <section className="grid gap-5 border-b-2 border-[#e7dccd] py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
                Ügyfél
              </p>
              <h2 className="mt-2 text-xl font-bold">
                {clientRow?.name || "Nincs kapcsolt ügyfél"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#493b2f]">
                {[clientRow?.email, clientRow?.phone].filter(Boolean).join(" | ") ||
                  "Nincs elérhetőség"}
              </p>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#493b2f]">
                {clientRow?.billing_address || clientRow?.project_address || ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
                Helyszín
              </p>
              <h2 className="mt-2 text-xl font-bold">
                {surveyRow?.title || "Kapcsolt felmérés"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#493b2f]">
                {[surveyRow?.postal_code, surveyRow?.settlement, surveyRow?.site_address]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>
          </section>

          <section className="border-b-2 border-[#e7dccd] py-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Projekt leírás
            </p>
            <p className="mt-3 text-base font-medium leading-8 text-[#332920]">
              {surveyRow?.project_goal || quoteDetail.notes || "Nincs részletes leírás."}
            </p>
          </section>

          <section className="py-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Tételek
            </p>
            <div className="mt-4 overflow-hidden rounded-[18px] border-2 border-[#d3c3ad]">
              <div className="grid grid-cols-[1fr_100px_120px_120px] bg-[#123f2d] px-4 py-3 text-sm font-bold text-white">
                <span>Megnevezés</span>
                <span>Mennyiség</span>
                <span>Egységár</span>
                <span className="text-right">Összesen</span>
              </div>
              {lineItems.length ? (
                lineItems.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="grid grid-cols-[1fr_100px_120px_120px] border-t border-[#e7dccd] px-4 py-4 text-sm font-semibold text-[#2a211a]"
                  >
                    <span>
                      {item.name || `Tétel ${index + 1}`}
                      {item.note ? (
                        <small className="mt-1 block font-medium text-[#6b5a4b]">
                          {item.note}
                        </small>
                      ) : null}
                    </span>
                    <span>
                      {item.quantity} {item.unit}
                    </span>
                    <span>{formatMoney(item.unitPrice)}</span>
                    <span className="text-right">{formatMoney(item.total)}</span>
                  </div>
                ))
              ) : (
                <p className="border-t border-[#e7dccd] px-4 py-5 text-sm font-semibold text-[#493b2f]">
                  Még nincs tétel az ajánlatban.
                </p>
              )}
            </div>
          </section>

          <section className="ml-auto grid max-w-sm gap-3 border-t-2 border-[#e7dccd] pt-6">
            <div className="flex justify-between text-base font-bold">
              <span>Nettó összeg</span>
              <span>{formatMoney(quoteDetail.subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>ÁFA</span>
              <span>{quoteDetail.vat_rate ?? 27}%</span>
            </div>
            <div className="flex justify-between rounded-[18px] bg-[#0d241b] px-4 py-4 text-xl font-bold text-white">
              <span>Végösszeg</span>
              <span>{formatMoney(quoteDetail.total)}</span>
            </div>
          </section>

          <footer className="mt-8 border-t-2 border-[#e7dccd] pt-5 text-sm font-semibold leading-7 text-[#493b2f]">
            Ez az ajánlat a felméréskor rögzített adatok alapján készült. A végleges
            műszaki tartalom és határidő helyszíni egyeztetés után pontosítható.
          </footer>
        </section>
      </div>
    </main>
  );
}
