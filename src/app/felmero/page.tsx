import Link from "next/link";

import { PostalCityFields } from "@/app/felmero/PostalCityFields";
import { saveSurveyDraft } from "@/app/felmero/actions";
import { withTimeout } from "@/lib/async";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const serviceCategories = [
  "Öntözőrendszer",
  "Burkolatok",
  "Pergolák",
  "Füvesítés",
  "Tereprendezés",
  "Telektisztítás",
  "Kerti világítás",
  "Kerítés építés",
];

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    clientId?: string;
  }>;
};

function InputField({
  id,
  label,
  name,
  placeholder,
  type = "text",
  defaultValue = "",
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  defaultValue?: string;
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
        placeholder={placeholder}
      />
    </div>
  );
}

export default async function FelmeroPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const sourceClientId = params.clientId?.trim() ?? "";

  let isLoggedIn = false;
  let userEmail: string | null = null;
  let prefilledClient:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        project_address: string | null;
        notes: string | null;
      }
    | null = null;

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await withTimeout(
      supabase.auth.getUser(),
      { data: { user: null }, error: null } as unknown as Awaited<
        ReturnType<typeof supabase.auth.getUser>
      >,
      3500,
    );

    isLoggedIn = Boolean(data.user);
    userEmail = data.user?.email ?? null;

    if (data.user && sourceClientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("id, name, email, phone, project_address, notes")
        .eq("id", sourceClientId)
        .maybeSingle();

      prefilledClient = client;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <section className="grid gap-5 rounded-[26px] border-2 border-[#cdbda8] bg-[#fffaf3] p-5 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
        <div>
          <div className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
            Felmérő űrlap
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight tracking-tight text-[#17130f] lg:text-4xl">
            Gyors, menthető helyszíni felmérés.
          </h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-[#44382e]">
            A cél most az, hogy a felmérés ne vesszen el: ügyfél, helyszín,
            kiválasztott munkák és első becslés egyből bekerül az adminba.
          </p>
        </div>

        <aside className="rounded-[24px] bg-[#0d241b] p-5 text-white shadow-[0_16px_44px_rgba(10,20,17,0.28)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            Mentési állapot
          </p>
          <h2 className="mt-3 text-2xl font-bold">
            {isLoggedIn ? "Belépve, mentés aktív" : "Belépés kell a mentéshez"}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-white">
            {isLoggedIn
              ? `Aktív felhasználó: ${userEmail}`
              : "A piszkozat mentéséhez előbb be kell jelentkezni."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-bold text-[#0b1a16] transition hover:bg-emerald-200"
            >
              Admin megnyitása
            </Link>
            <Link
              href="/app/ajanlatok"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-white/40"
            >
              Ajánlatok
            </Link>
          </div>
        </aside>
      </section>

      {params.error ? (
        <section className="rounded-[20px] border-2 border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold leading-7 text-rose-950">
          {params.error}
        </section>
      ) : null}

      {prefilledClient ? (
        <section className="rounded-[20px] border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold leading-7 text-emerald-950">
          Az űrlap elő van töltve ehhez az ügyfélhez: {prefilledClient.name}.
        </section>
      ) : null}

      <form action={saveSurveyDraft} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {prefilledClient ? (
          <input type="hidden" name="sourceClientId" value={prefilledClient.id} />
        ) : null}
        <section className="space-y-6">
          <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              1. Ügyfél
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Kihez tartozik a felmérés?
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <InputField
                id="clientName"
                label="Ügyfél neve"
                name="clientName"
                placeholder="Teljes név"
                defaultValue={prefilledClient?.name ?? ""}
              />
              <InputField
                id="clientEmail"
                label="Email"
                name="clientEmail"
                placeholder="pelda@email.hu"
                type="email"
                defaultValue={prefilledClient?.email ?? ""}
              />
              <InputField
                id="clientPhone"
                label="Telefon"
                name="clientPhone"
                placeholder="+36..."
                type="tel"
                defaultValue={prefilledClient?.phone ?? ""}
              />
            </div>
          </article>

          <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              2. Helyszín
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Hol lesz a munka?
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-[0.7fr_1fr]">
              <InputField
                id="title"
                label="Felmérés címe"
                name="title"
                placeholder="Pl. Pomáz kertfelmérés"
              />
              <InputField
                id="siteAddress"
                label="Projekt címe"
                name="siteAddress"
                placeholder="Utca, házszám"
                defaultValue={prefilledClient?.project_address ?? ""}
              />
            </div>
            <PostalCityFields />
          </article>

          <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              3. Munka tartalma
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Mit kell előkészíteni?
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-[1fr_0.75fr]">
              <div className="space-y-2">
                <label htmlFor="projectGoal" className="text-sm font-bold text-[#2a211a]">
                  Projekt célja
                </label>
                <textarea
                  id="projectGoal"
                  name="projectGoal"
                  rows={5}
                  className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                  placeholder="Rövid összefoglaló a munkáról"
                />
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="budgetTier" className="text-sm font-bold text-[#2a211a]">
                    Költségszint
                  </label>
                  <select
                    id="budgetTier"
                    name="budgetTier"
                    className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
                  >
                    <option value="">Válassz</option>
                    <option value="koltseghatekony">Költséghatékony</option>
                    <option value="kiegyensulyozott">Kiegyensúlyozott</option>
                    <option value="premium">Teljes műszaki tartalom</option>
                  </select>
                </div>
                <InputField
                  id="estimatedTotal"
                  label="Első becslés Ft-ban"
                  name="estimatedTotal"
                  placeholder="Pl. 1500000"
                  type="number"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-bold text-[#2a211a]">Kiválasztott munkák</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {serviceCategories.map((category) => (
                  <label
                    key={category}
                    className="flex cursor-pointer items-center gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-3 text-sm font-bold text-[#2d241d] transition hover:border-[#1e5a40] hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      name="serviceKeys"
                      value={category}
                      className="h-4 w-4 rounded border-[#bfa988] text-[#1e5a40] focus:ring-[#1e5a40]"
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </article>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <article className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              4. Megjegyzés és mentés
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Mit kell még tudni?
            </h2>
            <div className="mt-5 space-y-2">
              <label htmlFor="surveyNotes" className="text-sm font-bold text-[#2a211a]">
                Belső megjegyzés
              </label>
              <textarea
                id="surveyNotes"
                name="surveyNotes"
                rows={7}
                className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                placeholder="Pl. sürgős, visszahívást kér, külön kapubejáró, fotók később..."
              />
            </div>

            <div className="mt-5 rounded-[18px] border-2 border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-bold text-[#123f2d]">Mentés után</p>
              <p className="mt-2 text-sm font-medium leading-7 text-[#244f3c]">
                A felmérés az adminba kerül, onnan megnyitható, státuszozható,
                és ajánlat vázlat indítható belőle.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
                Piszkozat mentése
              </button>
              {isLoggedIn ? (
                <Link
                  href="/app"
                  className="rounded-full border-2 border-[#bfa988] bg-white px-6 py-3 text-center text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
                >
                  Mentett felmérések
                </Link>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="rounded-full border-2 border-[#bfa988] bg-white px-6 py-3 text-center text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
                >
                  Belépés a mentéshez
                </Link>
              )}
            </div>
          </article>
        </aside>
      </form>
    </main>
  );
}
