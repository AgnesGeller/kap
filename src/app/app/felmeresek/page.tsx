import Link from "next/link";

import { updateSurveyStatusFromList } from "@/app/app/felmeresek/actions";
import { withTimeout } from "@/lib/async";
import { createQueryTimeoutResponse } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
    q?: string;
    status?: string;
  }>;
};

type SurveyRow = {
  id: string;
  title: string | null;
  settlement: string | null;
  site_address: string | null;
  estimated_total: number | null;
  status: string | null;
  last_saved_at: string | null;
  created_at: string | null;
  service_keys: string[] | null;
};

const statusOptions = [
  { value: "", label: "Összes státusz" },
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
  if (!value) return "Még nincs mentés";

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "short",
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

function matchesSearch(survey: SurveyRow, query: string) {
  if (!query) return true;

  const haystack = [
    survey.title,
    survey.settlement,
    survey.site_address,
    survey.status,
    ...(survey.service_keys ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export default async function SurveysPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const searchQuery = (params.q ?? "").trim();
  const statusFilter = (params.status ?? "").trim();
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const returnParams = new URLSearchParams(
    Object.entries({
      q: searchQuery,
      status: statusFilter,
    }).filter(([, value]) => value),
  );
  const returnTo = `/app/felmeresek${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;
  const supabase = await createClient();

  const { data: surveys, error } = await withTimeout(
    supabase
      .from("site_surveys")
      .select(
        "id, title, settlement, site_address, estimated_total, status, last_saved_at, created_at, service_keys",
      )
      .order("last_saved_at", { ascending: false })
      .limit(80),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  const surveyRows = (surveys ?? []) as SurveyRow[];
  const visibleSurveys = surveyRows.filter((survey) => {
    const statusMatches = statusFilter ? survey.status === statusFilter : true;
    return statusMatches && matchesSearch(survey, normalizedSearchQuery);
  });
  const draftCount = surveyRows.filter((survey) => survey.status === "draft").length;
  const quotedCount = surveyRows.filter((survey) => survey.status === "quoted").length;
  const totalEstimate = surveyRows.reduce(
    (sum, survey) => sum + (survey.estimated_total ?? 0),
    0,
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            Felmérések
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-[#44382e]">
            Mentett helyszíni felmérések, státuszok és ajánlatindítási alapok.
          </p>
        </div>
        <Link
          href="/felmero"
          className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
        >
          Új felmérés
        </Link>
      </div>

      {error ? (
        <section className="rounded-[22px] border-2 border-amber-300 bg-amber-50 px-5 py-4 text-base font-semibold leading-7 text-amber-950">
          A felmérések még nem olvashatók a Supabase-ből. Hiba: {error.message}
        </section>
      ) : null}

      {params.message ? (
        <section className="rounded-[22px] border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold leading-7 text-emerald-950">
          {params.message}
        </section>
      ) : null}

      {params.error ? (
        <section className="rounded-[22px] border-2 border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold leading-7 text-rose-950">
          {params.error}
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Felmérések száma</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{surveyRows.length}</p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Piszkozat / ajánlat készült</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">
            {draftCount} / {quotedCount}
          </p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Előzetes becslés összesen</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">
            {formatMoney(totalEstimate)}
          </p>
        </article>
      </section>

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Lista
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Mentett felmérések
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]">
            {visibleSurveys.length} találat
          </span>
        </div>

        <form className="mt-6 grid gap-3 rounded-[20px] border-2 border-[#ded0bd] bg-[#fff8ee] p-4 md:grid-cols-[1fr_0.45fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="q" className="text-sm font-bold text-[#2a211a]">
              Gyors keresés
            </label>
            <input
              id="q"
              name="q"
              defaultValue={searchQuery}
              placeholder="Cím, település, munka vagy státusz"
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-bold text-[#2a211a]">
              Státusz
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40]"
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]">
            Szűrés
          </button>
          {searchQuery || statusFilter ? (
            <Link
              href="/app/felmeresek"
              className="rounded-full border-2 border-[#d3c3ad] bg-white px-6 py-3 text-center text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
            >
              Törlés
            </Link>
          ) : null}
        </form>

        {visibleSurveys.length ? (
          <div className="mt-6 grid gap-3">
            {visibleSurveys.map((survey) => (
              <article
                key={survey.id}
                className="grid gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <div>
                  <p className="text-lg font-bold text-[#17130f]">
                    {survey.title || "Mentett felmérés"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#44382e]">
                    {[survey.settlement, survey.site_address].filter(Boolean).join(" - ") ||
                      "Nincs megadott helyszín"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#4c4035]">
                    {survey.service_keys?.join(", ") || "Nincs kiválasztott munka"}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-[#123f2d]">
                  {formatStatus(survey.status)}
                </span>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#17130f]">
                    {formatMoney(survey.estimated_total)}
                  </p>
                  <p className="text-sm font-semibold text-[#44382e]">
                    {formatDate(survey.last_saved_at || survey.created_at)}
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:col-span-3 md:flex-row md:items-center md:justify-between">
                  <form
                    action={updateSurveyStatusFromList}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <input type="hidden" name="surveyId" value={survey.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <label
                      htmlFor={`status-${survey.id}`}
                      className="text-sm font-bold text-[#2a211a]"
                    >
                      Gyors státusz
                    </label>
                    <select
                      id={`status-${survey.id}`}
                      name="status"
                      defaultValue={survey.status ?? "draft"}
                      className="rounded-full border-2 border-[#d3c3ad] bg-white px-4 py-2 text-sm font-bold text-[#17130f] outline-none transition focus:border-[#1e5a40]"
                    >
                      {statusOptions
                        .filter((option) => option.value)
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                    <button className="rounded-full border-2 border-[#bfa988] bg-white px-4 py-2 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]">
                      Mentés
                    </button>
                  </form>
                  <Link
                    href={`/app/felmeresek/${survey.id}`}
                    className="w-fit rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]"
                  >
                    Felmérés megnyitása
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-5 text-base font-medium leading-8 text-[#44382e]">
            {searchQuery || statusFilter
              ? "Nincs találat erre a szűrésre."
              : "Még nincs mentett felmérés. Az új felmérő űrlap mentése után itt jelenik meg."}
          </div>
        )}
      </section>
    </main>
  );
}
