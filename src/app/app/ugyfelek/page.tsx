import Link from "next/link";

import { createClientRecord } from "@/app/app/ugyfelek/actions";
import { withTimeout } from "@/lib/async";
import { createQueryTimeoutResponse } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
    q?: string;
  }>;
};

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  project_address: string | null;
  notes: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Nincs adat";

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function Field({
  id,
  label,
  name,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
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
        placeholder={placeholder}
        className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

function matchesSearch(client: ClientRow, query: string) {
  if (!query) return true;

  const haystack = [
    client.name,
    client.email,
    client.phone,
    client.project_address,
    client.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const searchQuery = (params.q ?? "").trim();
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const supabase = await createClient();

  const { data: clients, error } = await withTimeout(
    supabase
      .from("clients")
      .select("id, name, email, phone, project_address, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  const clientRows = (clients ?? []) as ClientRow[];
  const visibleClients = clientRows.filter((client) =>
    matchesSearch(client, normalizedSearchQuery),
  );
  const withEmailCount = clientRows.filter((client) => Boolean(client.email)).length;
  const withPhoneCount = clientRows.filter((client) => Boolean(client.phone)).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            Ügyfelek
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-[#44382e]">
            Itt lehet gyorsan felvinni, keresni és megnyitni az ügyféladatokat.
          </p>
        </div>
        <Link
          href="/felmero"
          className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
        >
          Új felmérés
        </Link>
      </div>

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

      {error ? (
        <div className="rounded-[20px] border-2 border-amber-300 bg-amber-50 px-5 py-4 text-base font-semibold leading-7 text-amber-950">
          Az ügyféllista még nem olvasható a Supabase-ből. Hiba: {error.message}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Ügyfelek száma</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{clientRows.length}</p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Emaillel</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{withEmailCount}</p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Telefonnal</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{withPhoneCount}</p>
        </article>
      </section>

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Új ügyfél
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Ügyfél kézi felvitele
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]">
            Adminból menthető
          </span>
        </div>

        <form action={createClientRecord} className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field id="name" label="Név" name="name" placeholder="Ügyfél neve" />
          <Field
            id="email"
            label="Email-cím"
            name="email"
            type="email"
            placeholder="pelda@email.hu"
          />
          <Field
            id="phone"
            label="Telefonszám"
            name="phone"
            placeholder="+36 30 123 4567"
          />
          <Field
            id="projectAddress"
            label="Projekt címe"
            name="projectAddress"
            placeholder="Település, utca, házszám"
          />
          <Field
            id="billingAddress"
            label="Számlázási cím"
            name="billingAddress"
            placeholder="Ha eltér a projektcímtől"
          />
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-bold text-[#2a211a]">
              Megjegyzés
            </label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Rövid belső megjegyzés"
              rows={4}
              className="w-full resize-y rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
            />
          </div>
          <div className="lg:col-span-2">
            <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Ügyfél mentése
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Lista
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Mentett ügyfelek
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]">
            {visibleClients.length} rekord
          </span>
        </div>

        <form className="mt-6 flex flex-col gap-3 rounded-[20px] border-2 border-[#ded0bd] bg-[#fff8ee] p-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="q" className="text-sm font-bold text-[#2a211a]">
              Gyors keresés
            </label>
            <input
              id="q"
              name="q"
              defaultValue={searchQuery}
              placeholder="Név, email, telefon vagy cím"
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
            />
          </div>
          <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]">
            Keresés
          </button>
          {searchQuery ? (
            <Link
              href="/app/ugyfelek"
              className="rounded-full border-2 border-[#d3c3ad] bg-white px-6 py-3 text-center text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
            >
              Keresés törlése
            </Link>
          ) : null}
        </form>

        {visibleClients.length ? (
          <div className="mt-6 grid gap-3">
            {visibleClients.map((client) => (
              <Link
                href={`/app/ugyfelek/${client.id}`}
                key={client.id}
                className="grid gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white md:grid-cols-[1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="text-lg font-bold text-[#17130f]">{client.name}</p>
                  <p className="mt-1 text-sm font-medium text-[#44382e]">
                    {client.project_address || "Nincs megadott projektcím"}
                  </p>
                </div>
                <div className="text-sm font-semibold leading-7 text-[#44382e]">
                  <p>{client.email || "Nincs email"}</p>
                  <p>{client.phone || "Nincs telefon"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="rounded-full border border-[#e3d8c8] bg-white px-3 py-1 text-xs font-bold text-[#4c4035]">
                    {formatDate(client.created_at)}
                  </span>
                  <span className="rounded-full bg-[#123f2d] px-3 py-1 text-xs font-bold text-white">
                    Adatlap
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-5 text-base font-medium leading-8 text-[#44382e]">
            {searchQuery
              ? "Nincs találat erre a keresésre."
              : "Még nincs mentett ügyfél. Az új felmérés űrlapon vagy itt kézzel megadott ügyféladatok innen lesznek kezelhetők."}
          </div>
        )}
      </section>
    </main>
  );
}
