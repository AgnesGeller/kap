import Link from "next/link";

import { ConfirmSubmitButton } from "@/app/app/mukodes/ConfirmSubmitButton";
import {
  createClientRecord,
  deleteClientRecord,
  importWorkbookClients,
} from "@/app/app/ugyfelek/actions";
import { withTimeout } from "@/lib/async";
import { getWorkbookCustomerOptions } from "@/lib/budget/workbookData";
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
  billing_address?: string | null;
  notes: string | null;
  created_at: string | null;
};

type ClientListRow = ClientRow & {
  isWorkbookOnly?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "Excel";

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function normalize(value: string) {
  return value.toLocaleLowerCase("hu-HU").trim();
}

function isSampleCustomerName(value: string) {
  const normalized = normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return ["pelda", "teszt", "test", "minta"].some((word) =>
    normalized.includes(word),
  );
}

function matchesSearch(client: ClientListRow, query: string) {
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
    .toLocaleLowerCase("hu-HU");

  return haystack.includes(query);
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

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const searchQuery = (params.q ?? "").trim();
  const normalizedSearchQuery = searchQuery.toLocaleLowerCase("hu-HU");
  const workbookCustomers = getWorkbookCustomerOptions().filter(
    (customer) => !isSampleCustomerName(customer.name),
  );
  const supabase = await createClient();

  const { data: clients, error } = await withTimeout(
    supabase
      .from("clients")
      .select("id, name, email, phone, project_address, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    createQueryTimeoutResponse(
      "A Supabase lekérdezés időtúllépés miatt nem válaszolt.",
    ),
    6000,
  );

  const databaseClients = (clients ?? []) as ClientRow[];
  const databaseNames = new Set(databaseClients.map((client) => normalize(client.name)));
  const workbookOnlyClients = workbookCustomers
    .filter((customer) => !databaseNames.has(normalize(customer.name)))
    .filter((customer) => !isSampleCustomerName(customer.name));
  const workbookOnlyPreviewClients: ClientListRow[] = workbookOnlyClients.map((customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email || null,
    phone: customer.phone || null,
    project_address: customer.address || null,
    billing_address: null,
    notes: null,
    created_at: null,
    isWorkbookOnly: true,
  }));
  const allClients: ClientListRow[] = [...databaseClients, ...workbookOnlyPreviewClients].sort((a, b) =>
    a.name.localeCompare(b.name, "hu-HU"),
  );
  const visibleClients = allClients.filter((client) =>
    matchesSearch(client, normalizedSearchQuery),
  );
  const withEmailCount = allClients.filter((client) => Boolean(client.email)).length;
  const withPhoneCount = allClients.filter((client) => Boolean(client.phone)).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Ügyfélnyilvántartás
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17130f]">
            Ügyfelek
          </h1>
        </div>
        <Link
          href="/app/mukodes"
          className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
        >
          Munkalap nyitása
        </Link>
      </div>

      {params.message ? (
        <section className="rounded-[18px] border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950">
          {params.message}
        </section>
      ) : null}

      {params.error ? (
        <section className="rounded-[18px] border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-950">
          {params.error}
        </section>
      ) : null}

      {error ? (
        <div className="rounded-[18px] border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          Az ügyféllista még nem olvasható a Supabase-ből. Hiba: {error.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Ügyfelek" value={String(allClients.length)} />
        <Stat label="Emaillel" value={String(withEmailCount)} />
        <Stat label="Telefonnal" value={String(withPhoneCount)} />
      </section>

      <section id="ugyfel-lista" className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Új ügyfél
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">Kézi felvitel</h2>
          </div>
          {workbookOnlyClients.length ? (
            <form action={importWorkbookClients}>
              <button className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]">
                Ügyfelek mentése ({workbookOnlyClients.length})
              </button>
            </form>
          ) : null}
        </div>

        <form action={createClientRecord} className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field id="name" label="Név" name="name" placeholder="Ügyfél neve" />
          <Field id="email" label="Email-cím" name="email" type="email" placeholder="email@ceg.hu" />
          <Field id="phone" label="Telefonszám" name="phone" placeholder="+36 30 123 4567" />
          <Field id="projectAddress" label="Projekt címe" name="projectAddress" placeholder="Település, utca, házszám" />
          <Field id="billingAddress" label="Számlázási cím" name="billingAddress" placeholder="Ha eltér a projektcímtől" />
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-bold text-[#2a211a]">
              Megjegyzés
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Rövid belső megjegyzés"
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

      <section className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Lista
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">Ügyfélnyilvántartás</h2>
          </div>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]">
            {visibleClients.length} rekord
          </span>
        </div>

        <form className="mt-5 flex flex-col gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] p-4 md:flex-row md:items-end">
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
              Törlés
            </Link>
          ) : null}
        </form>

        {visibleClients.length ? (
          <div className="mt-5 grid gap-3">
            {visibleClients.map((client) => (
              <ClientListItem client={client} key={client.id} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-5 text-base font-medium leading-8 text-[#44382e]">
            {searchQuery ? "Nincs találat erre a keresésre." : "Még nincs ügyfél."}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[18px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_12px_28px_rgba(26,20,16,0.06)]">
      <p className="text-sm font-bold text-[#493b2f]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#17130f]">{value}</p>
    </article>
  );
}

function ClientListItem({ client }: { client: ClientListRow }) {
  const className =
    "grid gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4 transition hover:border-[#1e5a40] hover:bg-white md:grid-cols-[1fr_1fr_auto] md:items-center";

  return (
    <article className={className}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-bold text-[#17130f]">{client.name}</p>
          {client.isWorkbookOnly ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900">
              Excel
            </span>
          ) : null}
        </div>
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
        {client.isWorkbookOnly ? (
          <span className="rounded-full border border-[#e3d8c8] bg-white px-3 py-1.5 text-xs font-bold text-[#8b7b68]">
            -
          </span>
        ) : (
          <>
        <Link
          href={`/app/ugyfelek/${client.id}`}
          className="rounded-full bg-[#123f2d] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1d4d39]"
        >
          Módosítás
        </Link>
        <form action={deleteClientRecord}>
          <input type="hidden" name="clientId" value={client.id} />
          <ConfirmSubmitButton
            message="Biztosan törlöd ezt az ügyfelet?"
            className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
          >
            Törlés
          </ConfirmSubmitButton>
        </form>
          </>
        )}
      </div>
    </article>
  );
}
