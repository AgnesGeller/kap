import Link from "next/link";

import { withTimeout } from "@/lib/async";
import {
  createQueryFallbackSuccess,
  createQueryTimeoutResponse,
} from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
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

type QuoteRow = {
  id: string;
  status: string | null;
  total: number | null;
  created_at: string | null;
};

function formatStatus(status: string | null) {
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

export default async function AdminPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();

  const { data: surveys, error: surveysError } = await withTimeout(
    supabase
      .from("site_surveys")
      .select(
        "id, title, settlement, site_address, estimated_total, status, last_saved_at, created_at, service_keys",
      )
      .order("last_saved_at", { ascending: false })
      .limit(8),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  const { data: quotes } = await withTimeout(
    supabase
      .from("quotes")
      .select("id, status, total, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    createQueryFallbackSuccess([]),
    6000,
  );

  const surveyRows = (surveys ?? []) as SurveyRow[];
  const quoteRows = (quotes ?? []) as QuoteRow[];
  const draftCount = surveyRows.filter((survey) => survey.status === "draft").length;
  const quoteDraftCount = quoteRows.filter((quote) => quote.status === "draft").length;
  const quoteTotalValue = quoteRows.reduce((sum, quote) => sum + (quote.total ?? 0), 0);
  const latestSavedAt = surveyRows[0]?.last_saved_at ?? null;

  const stats = [
    {
      label: "Mentett felmérések",
      value: String(surveyRows.length),
      note: "A belépett céghez tartozó rekordok",
    },
    {
      label: "Piszkozatok",
      value: String(draftCount),
      note: "Folytatható mentések",
    },
    {
      label: "Ajánlat vázlatok",
      value: String(quoteRows.length),
      note: `${quoteDraftCount} még vázlat állapotban van`,
    },
    {
      label: "Ajánlati érték",
      value: formatMoney(quoteTotalValue),
      note: "Az eddig létrehozott ajánlat vázlatok összege",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <section className="grid gap-5 rounded-[26px] border-2 border-[#cdbda8] bg-[#fffaf3] p-5 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:grid-cols-[1.15fr_0.85fr] lg:p-7">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
            Admin dashboard
          </div>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight text-[#1b1712] lg:text-4xl">
            Egy felületen fut össze a mentés, az ügyfél és a következő lépés.
          </h1>
          <p className="max-w-3xl text-base font-medium leading-8 text-[#3f3429]">
            Az admin nézet a valódi mentett felméréseket olvassa a
            `site_surveys` táblából. A listából már megnyitható egy
            felmérés részletes nézete.
          </p>
        </div>

        <div className="rounded-[24px] bg-[#0d241b] p-5 text-white shadow-[0_16px_44px_rgba(10,20,17,0.28)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            Következő irány
          </p>
          <h2 className="mt-3 text-2xl font-bold">Valódi adatra kötött admin</h2>
          <ul className="mt-5 space-y-3 text-base leading-7 text-white">
            <li>Mentett felmérés megnyitása részletes oldalon</li>
            <li>Státusz, cím, munkák és technikai adatok egy helyen</li>
            <li>Ügyfél és ajánlat modul lesz a következő bővítés</li>
          </ul>
        </div>
      </section>

      {params.message ? (
        <div className="rounded-[20px] border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold leading-7 text-emerald-950">
          {params.message}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-[20px] border-2 border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold leading-7 text-rose-950">
          {params.error}
        </div>
      ) : null}

      {surveysError ? (
        <div className="rounded-[20px] border-2 border-amber-300 bg-amber-50 px-5 py-4 text-base font-semibold leading-7 text-amber-950">
          Az admin oldal még nem tudta kiolvasni a mentett felméréseket a
          Supabase-ből. Valószínűleg hiányzik a `site_surveys` select
          jogosultság vagy policy. Hiba: {surveysError.message}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]"
          >
            <p className="text-sm font-bold text-[#493b2f]">{stat.label}</p>
            <p className="mt-3 break-words text-3xl font-bold text-[#17130f]">
              {stat.value}
            </p>
            <p className="mt-3 text-sm font-medium leading-7 text-[#4c4035]">{stat.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/felmero"
          className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
            Gyors művelet
          </p>
          <p className="mt-2 text-lg font-bold text-[#17130f]">Új felmérés rögzítése</p>
          <p className="mt-2 text-sm font-medium leading-7 text-[#44382e]">
            Ügyféladat, helyszín, munka típusok és mentés egy helyen.
          </p>
        </Link>
        <Link
          href="/app/ajanlatok"
          className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
            Ajánlatok
          </p>
          <p className="mt-2 text-lg font-bold text-[#17130f]">Ajánlat vázlatok listája</p>
          <p className="mt-2 text-sm font-medium leading-7 text-[#44382e]">
            A felmérésekből indított ajánlatok egy külön listában látszanak.
          </p>
        </Link>
        <Link
          href="/app/ugyfelek"
          className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
            Ügyfelek
          </p>
          <p className="mt-2 text-lg font-bold text-[#17130f]">Ügyféllista megnyitása</p>
          <p className="mt-2 text-sm font-medium leading-7 text-[#44382e]">
            A felméréskor megadott ügyféladatok innen kezelhetők.
          </p>
        </Link>
        <Link
          href="/app/arlista"
          className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#674b25]">
            Árlista
          </p>
          <p className="mt-2 text-lg font-bold text-[#17130f]">Egységárak kezelése</p>
          <p className="mt-2 text-sm font-medium leading-7 text-[#44382e]">
            Kézi árlista felvitel most, Excel-import később.
          </p>
        </Link>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Felmérések
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
            Mentett piszkozatok és felmérések
          </h2>

          {surveyRows.length ? (
            <div className="mt-5 space-y-3">
              {surveyRows.map((survey) => (
                <Link
                  href={`/app/felmeresek/${survey.id}`}
                  key={survey.id}
                  className="block rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white hover:shadow-[0_12px_32px_rgba(26,20,16,0.1)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#17130f]">
                        {survey.title || "Mentett felmérés"}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-7 text-[#44382e]">
                        {[survey.settlement, survey.site_address]
                          .filter(Boolean)
                          .join(" - ") || "Nincs még megadott helyszín"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#123f2d]">
                        {formatStatus(survey.status)}
                      </span>
                      <span className="rounded-full bg-[#123f2d] px-3 py-1 text-xs font-bold text-white">
                        Részletek
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#4c4035]">
                    <span className="rounded-full border border-[#e3d8c8] bg-white px-3 py-1">
                      Mentve: {formatDate(survey.last_saved_at || survey.created_at)}
                    </span>
                    <span className="rounded-full border border-[#e3d8c8] bg-white px-3 py-1">
                      Becslés: {formatMoney(survey.estimated_total)}
                    </span>
                    <span className="rounded-full border border-[#e3d8c8] bg-white px-3 py-1">
                      {survey.service_keys?.length ?? 0} kiválasztott munka
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-5 text-base font-medium leading-8 text-[#44382e]">
              Még nincs kiolvasható mentett felmérés ehhez a céghez.
              Ha most mentettél először, és ez üres marad, akkor
              a következő körben a `site_surveys` select policy lesz a
              célzott teendő.
            </div>
          )}
        </article>

        <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Következő modulok
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
            Mi jön ezután
          </h2>
          <div className="mt-4 rounded-[18px] border-2 border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#123f2d]">
              Utolsó mentés
            </p>
            <p className="mt-2 text-lg font-bold text-[#17130f]">
              {latestSavedAt ? formatDate(latestSavedAt) : "Nincs adat"}
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {[
              "Valódi ügyféllista a clients táblából",
              "Ajánlatkészítés a mentett felmérésből",
              "Árlista import a költségvetésből",
              "Szűrhető státuszok és dátum szerinti lista",
              "Később naptár és feladatkövetés",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 text-sm font-semibold leading-7 text-[#44382e]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza a főoldalra
        </Link>
        <Link
          href="/felmero"
          className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
        >
          Felmérő űrlap megnyitása
        </Link>
      </div>
    </main>
  );
}
