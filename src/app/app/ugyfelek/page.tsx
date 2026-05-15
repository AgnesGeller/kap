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

const CLIENT_PAGE_SIZE = 40;

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
    q?: string;
    page?: string;
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

function normalize(value: string) {
  return value.toLocaleLowerCase("hu-HU").trim();
}

function getPage(value?: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
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
    client.billing_address,
    client.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("hu-HU");

  return haystack.includes(query);
}

function getPageHref(page: number, query: string) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));

  const suffix = params.toString();

  return suffix ? `/app/ugyfelek?${suffix}#ugyfel-lista` : "/app/ugyfelek#ugyfel-lista";
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
    <label htmlFor={id} className="space-y-2 text-sm font-bold text-[#2a211a]">
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </label>
  );
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const searchQuery = (params.q ?? "").trim();
  const normalizedSearchQuery = searchQuery.toLocaleLowerCase("hu-HU");
  const currentPage = getPage(params.page);
  const supabase = await createClient();
  const { data: authData } = await withTimeout(
    supabase.auth.getUser(),
    { data: { user: null }, error: null } as unknown as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >,
    3500,
  );
  const isTestAccount =
    authData.user?.email?.toLocaleLowerCase("hu-HU") === "teszt@teszt.com";
  const workbookCustomers = isTestAccount
    ? []
    : getWorkbookCustomerOptions().filter(
        (customer) => !isSampleCustomerName(customer.name),
      );

  const { data: clients, error } = isTestAccount
    ? { data: [] as ClientRow[], error: null }
    : await withTimeout(
        supabase
          .from("clients")
          .select("id, name, email, phone, project_address, billing_address, notes, created_at")
          .order("name", { ascending: true })
          .limit(600),
        createQueryTimeoutResponse(
          "Az ügyféllista lekérése túl sokáig tartott. Próbálj keresni névre vagy címre.",
        ),
        6000,
      );

  const databaseClients = (clients ?? []) as ClientRow[];
  const databaseNames = new Set(databaseClients.map((client) => normalize(client.name)));
  const workbookOnlyClients = workbookCustomers.filter(
    (customer) =>
      !databaseNames.has(normalize(customer.name)) && !isSampleCustomerName(customer.name),
  );
  const workbookOnlyPreviewClients: ClientListRow[] = workbookOnlyClients.map((customer) => ({
    id: customer.id,
    name: customer.name,
    email: customer.email || null,
    phone: customer.phone || null,
    project_address: customer.address || null,
    billing_address: customer.address || null,
    notes: customer.notes || null,
    created_at: null,
    isWorkbookOnly: true,
  }));
  const allClients: ClientListRow[] = [...databaseClients, ...workbookOnlyPreviewClients].sort(
    (a, b) => a.name.localeCompare(b.name, "hu-HU"),
  );
  const visibleClients = allClients.filter((client) =>
    matchesSearch(client, normalizedSearchQuery),
  );
  const pageCount = Math.max(1, Math.ceil(visibleClients.length / CLIENT_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const paginatedClients = visibleClients.slice(
    (safePage - 1) * CLIENT_PAGE_SIZE,
    safePage * CLIENT_PAGE_SIZE,
  );
  const withEmailCount = allClients.filter((client) => Boolean(client.email)).length;
  const withPhoneCount = allClients.filter((client) => Boolean(client.phone)).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-5 py-5 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Ügyfélnyilvántartás
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#17130f]">
            Ügyfelek
          </h1>
        </div>
        <Link
          href="/app/mukodes"
          className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
        >
          Munkalap
        </Link>
      </div>

      {params.message ? (
        <section className="rounded-[16px] border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950">
          {params.message}
        </section>
      ) : null}

      {params.error ? (
        <section className="rounded-[16px] border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-950">
          {params.error}
        </section>
      ) : null}

      {error ? (
        <div className="rounded-[16px] border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          Az ügyféllista most nem olvasható. Hiba: {error.message}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <Stat label="Ügyfelek" value={String(allClients.length)} />
        <Stat label="Email" value={String(withEmailCount)} />
        <Stat label="Telefon" value={String(withPhoneCount)} />
      </section>

      <section
        id="ugyfel-lista"
        className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_34px_rgba(26,20,16,0.07)]"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Lista
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#17130f]">
              Keresés és módosítás
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]">
            {visibleClients.length} találat
          </span>
        </div>

        <form className="mt-4 flex flex-col gap-3 rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] p-4 md:flex-row md:items-end">
          <label htmlFor="q" className="flex-1 space-y-2 text-sm font-bold text-[#2a211a]">
            <span>Gyors keresés</span>
            <input
              id="q"
              name="q"
              defaultValue={searchQuery}
              placeholder="Név, email, telefon vagy cím"
              className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
            />
          </label>
          <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]">
            Keresés
          </button>
          {searchQuery ? (
            <Link
              href="/app/ugyfelek#ugyfel-lista"
              className="rounded-full border-2 border-[#d3c3ad] bg-white px-6 py-3 text-center text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
            >
              Keresés törlése
            </Link>
          ) : null}
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Pagination page={safePage} pageCount={pageCount} query={searchQuery} />
          {workbookOnlyClients.length ? (
            <form action={importWorkbookClients}>
              <button className="rounded-full bg-[#123f2d] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]">
                Hiányzó ügyfelek mentése ({workbookOnlyClients.length})
              </button>
            </form>
          ) : null}
        </div>

        {paginatedClients.length ? (
          <div className="mt-4 overflow-hidden rounded-[18px] border-2 border-[#ded0bd]">
            <div className="max-h-[680px] overflow-auto">
              <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#123f2d] text-white">
                  <tr>
                    <th className="px-4 py-3 font-bold">Név</th>
                    <th className="px-4 py-3 font-bold">Cím</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 font-bold">Telefon</th>
                    <th className="px-4 py-3 text-right font-bold">Művelet</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map((client) => (
                    <ClientTableRow client={client} key={client.id} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-5 text-base font-medium leading-8 text-[#44382e]">
            {searchQuery ? "Nincs találat erre a keresésre." : "Még nincs ügyfél."}
          </div>
        )}

        <div className="mt-4">
          <Pagination page={safePage} pageCount={pageCount} query={searchQuery} />
        </div>
      </section>

      <details className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_34px_rgba(26,20,16,0.07)]">
        <summary className="cursor-pointer text-xl font-bold text-[#17130f]">
          Új ügyfél felvitele
        </summary>
        <form action={createClientRecord} className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field id="name" label="Név" name="name" placeholder="Ügyfél neve" />
          <Field id="email" label="Email-cím" name="email" type="email" placeholder="email@ceg.hu" />
          <Field id="phone" label="Telefonszám" name="phone" placeholder="+36 30 123 4567" />
          <Field id="projectAddress" label="Projekt címe" name="projectAddress" placeholder="Település, utca, házszám" />
          <Field id="billingAddress" label="Számlázási cím" name="billingAddress" placeholder="Ha eltér a projektcímtől" />
          <label htmlFor="notes" className="space-y-2 text-sm font-bold text-[#2a211a]">
            <span>Megjegyzés</span>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Rövid belső megjegyzés"
              className="w-full resize-y rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
            />
          </label>
          <div className="lg:col-span-2">
            <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Ügyfél mentése
            </button>
          </div>
        </form>
      </details>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[18px] border-2 border-[#d3c3ad] bg-white p-4 shadow-[0_12px_28px_rgba(26,20,16,0.06)]">
      <p className="text-sm font-bold text-[#493b2f]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#17130f]">{value}</p>
    </article>
  );
}

function Pagination({
  page,
  pageCount,
  query,
}: {
  page: number;
  pageCount: number;
  query: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Lapozás" className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-[#e3d8c8] bg-white px-3 py-2 text-sm font-bold text-[#4c4035]">
        {page}. oldal / {pageCount}
      </span>
      {page > 1 ? (
        <Link
          href={getPageHref(page - 1, query)}
          className="rounded-full border-2 border-[#bfa988] bg-white px-4 py-2 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Előző
        </Link>
      ) : null}
      {page < pageCount ? (
        <Link
          href={getPageHref(page + 1, query)}
          className="rounded-full bg-[#123f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1d4d39]"
        >
          Következő
        </Link>
      ) : null}
    </nav>
  );
}

function ClientTableRow({ client }: { client: ClientListRow }) {
  return (
    <tr className="border-t border-[#eadfce] odd:bg-white even:bg-[#fff8ee]">
      <td className="px-4 py-3 align-top font-bold text-[#17130f]">{client.name}</td>
      <td className="max-w-[320px] px-4 py-3 align-top font-semibold text-[#44382e]">
        {client.project_address || client.billing_address || "-"}
      </td>
      <td className="px-4 py-3 align-top font-semibold text-[#44382e]">
        {client.email || "-"}
      </td>
      <td className="px-4 py-3 align-top font-semibold text-[#44382e]">
        {client.phone || "-"}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          {client.isWorkbookOnly ? (
            <span className="rounded-full border border-[#e3d8c8] bg-white px-3 py-1.5 text-xs font-bold text-[#8b7b68]">
              Mentés előtt
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
      </td>
    </tr>
  );
}
