import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createQuoteFromSurvey,
  updateSurveyStatus,
} from "@/app/app/felmeresek/[id]/actions";
import { withTimeout } from "@/lib/async";
import {
  createQueryFallbackSuccess,
  createQueryTimeoutResponse,
} from "@/lib/supabase/errors";
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

type SurveyDetail = {
  id: string;
  title: string | null;
  status: string | null;
  source: string | null;
  site_address: string | null;
  postal_code: string | null;
  settlement: string | null;
  project_goal: string | null;
  budget_tier: string | null;
  service_keys: string[] | null;
  form_payload: Record<string, unknown> | null;
  map_payload: Record<string, unknown> | null;
  estimated_total: number | null;
  last_saved_at: string | null;
  created_at: string | null;
};

type QuoteRow = {
  id: string;
  title: string;
  status: string | null;
  total: number | null;
  created_at: string | null;
};

const statusOptions = [
  { value: "draft", label: "Piszkozat" },
  { value: "submitted", label: "Beküldve" },
  { value: "in_review", label: "Átnézés alatt" },
  { value: "quoted", label: "Ajánlat készült" },
  { value: "won", label: "Megnyert" },
  { value: "lost", label: "Elveszett" },
  { value: "archived", label: "Archivált" },
];

function formatStatus(status: string | null) {
  return statusOptions.find((option) => option.value === status)?.label ?? "Ismeretlen";
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

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatQuoteStatus(status: string | null) {
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

function getPayloadText(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold leading-7 text-[#17130f]">
        {value || "Nincs adat"}
      </p>
    </div>
  );
}

export default async function SurveyDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const paramsValue = (await searchParams) ?? {};
  const supabase = await createClient();

  const { data, error } = await withTimeout(
    supabase
      .from("site_surveys")
      .select(
        "id, title, status, source, site_address, postal_code, settlement, project_goal, budget_tier, service_keys, form_payload, map_payload, estimated_total, last_saved_at, created_at",
      )
      .eq("id", id)
      .single(),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  if (error || !data) {
    notFound();
  }

  const survey = data as SurveyDetail;
  const { data: quotes } = await withTimeout(
    supabase
      .from("quotes")
      .select("id, title, status, total, created_at")
      .eq("survey_id", survey.id)
      .order("created_at", { ascending: false }),
    createQueryFallbackSuccess([]),
    6000,
  );

  const services = survey.service_keys ?? [];
  const quoteRows = (quotes ?? []) as QuoteRow[];
  const clientName = getPayloadText(survey.form_payload, "clientName");
  const clientEmail = getPayloadText(survey.form_payload, "clientEmail");
  const clientPhone = getPayloadText(survey.form_payload, "clientPhone");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app"
          className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza az adminhoz
        </Link>
        <Link
          href="/felmero"
          className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
        >
          Új felmérés
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

      <section className="grid gap-6 rounded-[26px] border-2 border-[#cdbda8] bg-[#fffaf3] p-5 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Felmérés részletei
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            {survey.title || "Mentett felmérés"}
          </h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[#44382e]">
            {[survey.settlement, survey.site_address].filter(Boolean).join(" - ") ||
              "Nincs még megadott helyszín"}
          </p>
        </div>

        <div className="rounded-[24px] bg-[#0d241b] p-5 text-white shadow-[0_16px_44px_rgba(10,20,17,0.28)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                Státusz
              </p>
              <p className="mt-2 text-2xl font-bold">{formatStatus(survey.status)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                Előzetes összeg
              </p>
              <p className="mt-2 text-2xl font-bold">
                {formatMoney(survey.estimated_total)}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-[18px] border border-white/14 bg-white/8 px-4 py-4 text-sm font-semibold leading-7 text-white">
            Utolsó mentés: {formatDate(survey.last_saved_at || survey.created_at)}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Státusz kezelése
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
            Hol tart ez a felmérés?
          </h2>
          <form action={updateSurveyStatus} className="mt-5 grid gap-4">
            <input type="hidden" name="surveyId" value={survey.id} />
            <label htmlFor="status" className="text-sm font-bold text-[#2a211a]">
              Új státusz
            </label>
            <select
              id="status"
              name="status"
              defaultValue={survey.status ?? "draft"}
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="inline-flex w-fit rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Státusz mentése
            </button>
          </form>
        </article>

        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Ügyféladatok
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DetailRow label="Név" value={clientName} />
            <DetailRow label="Email" value={clientEmail} />
            <DetailRow label="Telefon" value={clientPhone} />
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Ajánlat előkészítése
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
            Ajánlat vázlat ebből a felmérésből
          </h2>
          <p className="mt-3 text-base font-medium leading-8 text-[#44382e]">
            Ez még nem végleges árazás. A kiválasztott munkákból létrehoz egy
            ajánlat vázlatot, amit később árakkal és részletekkel lehet bővíteni.
          </p>
          <form action={createQuoteFromSurvey} className="mt-5">
            <input type="hidden" name="surveyId" value={survey.id} />
            <button className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Ajánlat vázlat létrehozása
            </button>
          </form>
        </article>

        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Kapcsolódó ajánlatok
          </p>
          {quoteRows.length ? (
            <div className="mt-5 grid gap-3">
              {quoteRows.map((quote) => (
                <Link
                  href={`/app/ajanlatok/${quote.id}`}
                  key={quote.id}
                  className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-[#17130f]">{quote.title}</p>
                      <p className="mt-1 text-sm font-semibold text-[#44382e]">
                        {formatDate(quote.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-[#123f2d]">
                      {formatQuoteStatus(quote.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-bold text-[#17130f]">
                    {formatMoney(quote.total)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-4 text-base font-medium leading-8 text-[#44382e]">
              Ehhez a felméréshez még nincs ajánlat vázlat.
            </p>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Alapadatok
          </p>
          <div className="mt-5 grid gap-3">
            <DetailRow label="Település" value={survey.settlement ?? ""} />
            <DetailRow label="Irányítószám" value={survey.postal_code ?? ""} />
            <DetailRow label="Projekt címe" value={survey.site_address ?? ""} />
            <DetailRow label="Költségszint" value={survey.budget_tier ?? ""} />
            <DetailRow label="Forrás" value={survey.source ?? ""} />
          </div>
        </article>

        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Projekt célja
          </p>
          <p className="mt-4 min-h-28 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 text-base font-medium leading-8 text-[#17130f]">
            {survey.project_goal || "Nincs még megadott projektcél."}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Kiválasztott munkák
          </p>
          {services.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {services.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]"
                >
                  {service}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-4 text-base font-medium text-[#44382e]">
              Nincs kiválasztott munka.
            </p>
          )}
        </article>

        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Technikai adatok
          </p>
          <div className="mt-5 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] p-4">
            <pre className="max-h-72 overflow-auto text-xs leading-6 text-[#2a211a]">
              {JSON.stringify(
                {
                  form_payload: survey.form_payload,
                  map_payload: survey.map_payload,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </article>
      </section>
    </main>
  );
}
