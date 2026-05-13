import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createQuoteForClient,
  updateClient,
} from "@/app/app/ugyfelek/[id]/actions";
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

type ClientDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  project_address: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SurveyRow = {
  id: string;
  title: string | null;
  status: string | null;
  site_address: string | null;
  settlement: string | null;
  estimated_total: number | null;
  created_at: string | null;
};

type QuoteRow = {
  id: string;
  title: string;
  status: string | null;
  total: number | null;
  created_at: string | null;
  survey_id: string | null;
};

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

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatSurveyStatus(status: string | null) {
  switch (status) {
    case "draft":
      return "Piszkozat";
    case "submitted":
      return "Beküldve";
    case "in_review":
      return "Átnézés alatt";
    case "quoted":
      return "Ajánlat készült";
    case "won":
      return "Megnyert";
    case "lost":
      return "Elveszett";
    case "archived":
      return "Archivált";
    default:
      return "Ismeretlen";
  }
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

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-semibold leading-7 text-[#17130f]">
        {value || "Nincs adat"}
      </p>
    </div>
  );
}

function TextInput({
  id,
  label,
  name,
  defaultValue,
  type = "text",
}: {
  id: string;
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-[#2a211a]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const paramsValue = (await searchParams) ?? {};
  const supabase = await createClient();

  const { data: client, error } = await withTimeout(
    supabase
      .from("clients")
      .select(
        "id, name, email, phone, billing_address, project_address, notes, created_at, updated_at",
      )
      .eq("id", id)
      .single(),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  if (error || !client) {
    notFound();
  }

  const clientDetail = client as ClientDetail;

  const { data: surveys } = await withTimeout(
    supabase
      .from("site_surveys")
      .select("id, title, status, site_address, settlement, estimated_total, created_at")
      .eq("client_id", clientDetail.id)
      .order("created_at", { ascending: false })
      .limit(20),
    createQueryFallbackSuccess([]),
    6000,
  );

  const { data: quotes } = await withTimeout(
    supabase
      .from("quotes")
      .select("id, title, status, total, created_at, survey_id")
      .eq("client_id", clientDetail.id)
      .order("created_at", { ascending: false })
      .limit(20),
    createQueryFallbackSuccess([]),
    6000,
  );

  const surveyRows = (surveys ?? []) as SurveyRow[];
  const quoteRows = (quotes ?? []) as QuoteRow[];
  const surveyValue = surveyRows.reduce(
    (sum, survey) => sum + (survey.estimated_total ?? 0),
    0,
  );
  const quoteValue = quoteRows.reduce((sum, quote) => sum + (quote.total ?? 0), 0);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app/ugyfelek"
          className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza az ügyfelekhez
        </Link>
        <Link
          href={`/felmero?clientId=${clientDetail.id}`}
          className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
        >
          Új felmérés ehhez az ügyfélhez
        </Link>
      </div>

      <section className="grid gap-5 rounded-[26px] border-2 border-[#cdbda8] bg-[#fffaf3] p-5 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Ügyfél adatlap
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            {clientDetail.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[#44382e]">
            {clientDetail.project_address || "Nincs megadott projektcím"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-[20px] border-2 border-[#d3c3ad] bg-white p-5">
            <p className="text-sm font-bold text-[#493b2f]">Felmérések</p>
            <p className="mt-3 text-3xl font-bold text-[#17130f]">{surveyRows.length}</p>
            <p className="mt-2 text-sm font-semibold text-[#44382e]">
              {formatMoney(surveyValue)}
            </p>
          </article>
          <article className="rounded-[20px] border-2 border-[#d3c3ad] bg-white p-5">
            <p className="text-sm font-bold text-[#493b2f]">Ajánlatok</p>
            <p className="mt-3 text-3xl font-bold text-[#17130f]">{quoteRows.length}</p>
            <p className="mt-2 text-sm font-semibold text-[#44382e]">
              {formatMoney(quoteValue)}
            </p>
          </article>
        </div>
      </section>

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

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Következő lépés
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Munka indítása ebből az ügyfélből
            </h2>
            <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-[#44382e]">
              Ha új helyszíni felmérés kell, az űrlap előtöltődik. Ha már elég
              adat van, közvetlenül ajánlatvázlatot is nyithatsz.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/felmero?clientId=${clientDetail.id}`}
              className="rounded-full bg-[#123f2d] px-5 py-3 text-center text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
            >
              Felmérés indítása
            </Link>
            <form action={createQuoteForClient}>
              <input type="hidden" name="clientId" value={clientDetail.id} />
              <button className="w-full rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5] sm:w-auto">
                Ajánlatvázlat indítása
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Elérhetőség
          </p>
          <div className="mt-5 grid gap-3">
            <DetailBox label="Email" value={clientDetail.email ?? ""} />
            <DetailBox label="Telefon" value={clientDetail.phone ?? ""} />
            <DetailBox label="Projekt cím" value={clientDetail.project_address ?? ""} />
            <DetailBox label="Számlázási cím" value={clientDetail.billing_address ?? ""} />
            <DetailBox label="Létrehozva" value={formatDate(clientDetail.created_at)} />
          </div>
        </article>

        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Megjegyzés
          </p>
          <p className="mt-5 min-h-40 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 text-base font-medium leading-8 text-[#17130f]">
            {clientDetail.notes || "Nincs ügyfélhez mentett megjegyzés."}
          </p>
        </article>
      </section>

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
          Ügyféladatok szerkesztése
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
          Elérhetőségek és megjegyzés frissítése
        </h2>
        <form action={updateClient} className="mt-5 grid gap-5">
          <input type="hidden" name="clientId" value={clientDetail.id} />
          <div className="grid gap-5 md:grid-cols-3">
            <TextInput
              id="name"
              label="Ügyfél neve"
              name="name"
              defaultValue={clientDetail.name}
            />
            <TextInput
              id="email"
              label="Email"
              name="email"
              type="email"
              defaultValue={clientDetail.email ?? ""}
            />
            <TextInput
              id="phone"
              label="Telefon"
              name="phone"
              type="tel"
              defaultValue={clientDetail.phone ?? ""}
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <TextInput
              id="projectAddress"
              label="Projekt cím"
              name="projectAddress"
              defaultValue={clientDetail.project_address ?? ""}
            />
            <TextInput
              id="billingAddress"
              label="Számlázási cím"
              name="billingAddress"
              defaultValue={clientDetail.billing_address ?? ""}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-bold text-[#2a211a]">
              Ügyfél megjegyzés
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={5}
              defaultValue={clientDetail.notes ?? ""}
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
            />
          </div>
          <button className="w-fit rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
            Ügyféladatok mentése
          </button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Kapcsolódó felmérések
          </p>
          {surveyRows.length ? (
            <div className="mt-5 grid gap-3">
              {surveyRows.map((survey) => (
                <Link
                  href={`/app/felmeresek/${survey.id}`}
                  key={survey.id}
                  className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-[#17130f]">
                        {survey.title || "Mentett felmérés"}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#44382e]">
                        {[survey.settlement, survey.site_address]
                          .filter(Boolean)
                          .join(" - ") || "Nincs megadott helyszín"}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-[#123f2d]">
                      {formatSurveyStatus(survey.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#17130f]">
                    {formatMoney(survey.estimated_total)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-4 text-base font-medium leading-8 text-[#44382e]">
              Ehhez az ügyfélhez még nincs kapcsolódó felmérés.
            </p>
          )}
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
                      <p className="mt-1 text-sm font-medium text-[#44382e]">
                        {formatDate(quote.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-[#123f2d]">
                      {formatQuoteStatus(quote.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#17130f]">
                    {formatMoney(quote.total)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-4 text-base font-medium leading-8 text-[#44382e]">
              Ehhez az ügyfélhez még nincs kapcsolódó ajánlat.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
