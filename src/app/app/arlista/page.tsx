import Link from "next/link";

import {
  createPriceItem,
  updatePriceItem,
  updatePriceItemStatus,
} from "@/app/app/arlista/actions";
import { withTimeout } from "@/lib/async";
import { createQueryTimeoutResponse } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
    q?: string;
    status?: string;
    category?: string;
  }>;
};

type PriceItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  unit_price: number | null;
  vat_rate: number | null;
  status: string | null;
  notes: string | null;
  source: string | null;
  updated_at: string | null;
};

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
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string | null) {
  switch (status) {
    case "active":
      return "Aktív";
    case "inactive":
      return "Inaktív";
    case "archived":
      return "Archivált";
    default:
      return "Ismeretlen";
  }
}

function Field({
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
  defaultValue?: string | number;
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
        placeholder={placeholder}
        className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

function matchesSearch(item: PriceItem, query: string) {
  if (!query) return true;

  const haystack = [
    item.name,
    item.category,
    item.unit,
    item.notes,
    item.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export default async function PriceListPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const searchQuery = (params.q ?? "").trim();
  const statusFilter = (params.status ?? "").trim();
  const categoryFilter = (params.category ?? "").trim();
  const normalizedSearchQuery = searchQuery.toLowerCase();
  const returnParams = new URLSearchParams(
    Object.entries({
      q: searchQuery,
      status: statusFilter,
      category: categoryFilter,
    }).filter(([, value]) => value),
  );
  const returnTo = `/app/arlista${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;
  const supabase = await createClient();

  const { data, error } = await withTimeout(
    supabase
      .from("price_items")
      .select("id, name, category, unit, unit_price, vat_rate, status, notes, source, updated_at")
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(100),
    createQueryTimeoutResponse(
      "Az árlista tábla még nincs élesítve a Supabase-ben, ezért az import következő lépés.",
    ),
    6000,
  );

  const priceItems = (data ?? []) as PriceItem[];
  const setupMessage = error?.message ?? "";
  const categories = Array.from(
    new Set(priceItems.map((item) => item.category).filter(Boolean)),
  ).sort((a, b) => String(a).localeCompare(String(b), "hu"));
  const visiblePriceItems = priceItems.filter((item) => {
    const statusMatches = statusFilter ? item.status === statusFilter : true;
    const categoryMatches = categoryFilter ? item.category === categoryFilter : true;
    return statusMatches && categoryMatches && matchesSearch(item, normalizedSearchQuery);
  });
  const activeCount = priceItems.filter((item) => item.status === "active").length;
  const categoryCount = new Set(
    priceItems.map((item) => item.category).filter(Boolean),
  ).size;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17130f] lg:text-4xl">
            Árlista
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-[#44382e]">
            Céges egységárak, amelyekből gyorsan épülhetnek az ajánlati
            tételek. A tételek itt már szerkeszthetők is.
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Vissza az adminhoz
        </Link>
      </div>

      {setupMessage ? (
        <section className="rounded-[22px] border-2 border-amber-300 bg-amber-50 px-5 py-4 text-base font-semibold leading-7 text-amber-950">
          {setupMessage}
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
          <p className="text-sm font-bold text-[#493b2f]">Árlista tételek</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{priceItems.length}</p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Aktív tételek</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{activeCount}</p>
        </article>
        <article className="rounded-[22px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)]">
          <p className="text-sm font-bold text-[#493b2f]">Kategóriák</p>
          <p className="mt-3 text-3xl font-bold text-[#17130f]">{categoryCount}</p>
        </article>
      </section>

      <section className="rounded-[24px] border-2 border-[#d3c3ad] bg-white p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Új tétel
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#17130f]">
              Egységár kézi felvitele
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]">
            Import előtt is használható
          </span>
        </div>

        <form action={createPriceItem} className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.7fr_0.35fr_0.45fr_0.35fr]">
          <Field
            id="name"
            label="Tétel neve"
            name="name"
            placeholder="Pl. gyepszőnyeg telepítés"
          />
          <Field
            id="category"
            label="Kategória"
            name="category"
            placeholder="Pl. Füvesítés"
          />
          <Field id="unit" label="Egység" name="unit" placeholder="m2" defaultValue="db" />
          <Field
            id="unitPrice"
            label="Egységár"
            name="unitPrice"
            type="number"
            placeholder="0"
          />
          <Field
            id="vatRate"
            label="ÁFA %"
            name="vatRate"
            type="number"
            placeholder="27"
            defaultValue={27}
          />
          <div className="space-y-2 lg:col-span-4">
            <label htmlFor="notes" className="text-sm font-bold text-[#2a211a]">
              Megjegyzés
            </label>
            <input
              id="notes"
              name="notes"
              placeholder="Rövid belső megjegyzés"
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
              Tétel mentése
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
              Céges egységárak
            </h2>
          </div>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-bold text-[#123f2d]">
            {visiblePriceItems.length} találat
          </span>
        </div>

        <form className="mt-6 grid gap-3 rounded-[20px] border-2 border-[#ded0bd] bg-[#fff8ee] p-4 md:grid-cols-[1fr_0.45fr_0.45fr_auto_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="q" className="text-sm font-bold text-[#2a211a]">
              Gyors keresés
            </label>
            <input
              id="q"
              name="q"
              defaultValue={searchQuery}
              placeholder="Tétel, kategória, egység vagy megjegyzés"
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-bold text-[#2a211a]">
              Kategória
            </label>
            <select
              id="category"
              name="category"
              defaultValue={categoryFilter}
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40]"
            >
              <option value="">Összes kategória</option>
              {categories.map((category) => (
                <option key={category} value={category ?? ""}>
                  {category}
                </option>
              ))}
            </select>
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
              <option value="">Összes státusz</option>
              <option value="active">Aktív</option>
              <option value="inactive">Inaktív</option>
              <option value="archived">Archivált</option>
            </select>
          </div>
          <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]">
            Szűrés
          </button>
          {searchQuery || statusFilter || categoryFilter ? (
            <Link
              href="/app/arlista"
              className="rounded-full border-2 border-[#d3c3ad] bg-white px-6 py-3 text-center text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
            >
              Törlés
            </Link>
          ) : null}
        </form>

        {visiblePriceItems.length ? (
          <div className="mt-6 grid gap-3">
            {visiblePriceItems.map((item) => (
              <article
                key={item.id}
                className="rounded-[18px] border-2 border-[#ded0bd] bg-[#fff8ee] px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-[#17130f]">{item.name}</p>
                    <p className="mt-1 text-sm font-semibold text-[#44382e]">
                      {item.category || "Nincs kategória"} • frissítve:{" "}
                      {formatDate(item.updated_at)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="w-fit rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-[#123f2d]">
                      {formatStatus(item.status)}
                    </span>
                    <p className="mt-2 text-lg font-bold text-[#17130f]">
                      {formatMoney(item.unit_price)}
                    </p>
                    <p className="text-sm font-semibold text-[#44382e]">
                      / {item.unit} + ÁFA {item.vat_rate ?? 27}%
                    </p>
                  </div>
                </div>

                <form action={updatePriceItem} className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.65fr_0.28fr_0.35fr_0.28fr_0.4fr]">
                  <input type="hidden" name="priceItemId" value={item.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <Field
                    id={`name-${item.id}`}
                    label="Tétel neve"
                    name="name"
                    placeholder="Tétel neve"
                    defaultValue={item.name}
                  />
                  <Field
                    id={`category-${item.id}`}
                    label="Kategória"
                    name="category"
                    placeholder="Kategória"
                    defaultValue={item.category ?? ""}
                  />
                  <Field
                    id={`unit-${item.id}`}
                    label="Egység"
                    name="unit"
                    placeholder="db"
                    defaultValue={item.unit}
                  />
                  <Field
                    id={`unitPrice-${item.id}`}
                    label="Egységár"
                    name="unitPrice"
                    type="number"
                    placeholder="0"
                    defaultValue={item.unit_price ?? 0}
                  />
                  <Field
                    id={`vatRate-${item.id}`}
                    label="ÁFA %"
                    name="vatRate"
                    type="number"
                    placeholder="27"
                    defaultValue={item.vat_rate ?? 27}
                  />
                  <div className="space-y-2">
                    <label
                      htmlFor={`status-${item.id}`}
                      className="text-sm font-bold text-[#2a211a]"
                    >
                      Státusz
                    </label>
                    <select
                      id={`status-${item.id}`}
                      name="status"
                      defaultValue={item.status ?? "active"}
                      className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
                    >
                      <option value="active">Aktív</option>
                      <option value="inactive">Inaktív</option>
                      <option value="archived">Archivált</option>
                    </select>
                  </div>
                  <div className="space-y-2 lg:col-span-5">
                    <label
                      htmlFor={`notes-${item.id}`}
                      className="text-sm font-bold text-[#2a211a]"
                    >
                      Megjegyzés
                    </label>
                    <input
                      id={`notes-${item.id}`}
                      name="notes"
                      defaultValue={item.notes ?? ""}
                      placeholder="Belső megjegyzés"
                      className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <button className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.14)] transition hover:bg-[#1d4d39]">
                      Módosítás mentése
                    </button>
                  </div>
                </form>

                <form action={updatePriceItemStatus} className="mt-3">
                  <input type="hidden" name="priceItemId" value={item.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input
                    type="hidden"
                    name="status"
                    value={item.status === "active" ? "inactive" : "active"}
                  />
                  <button className="rounded-full border border-[#d3c3ad] bg-white px-3 py-1 text-xs font-bold text-[#4c4035] transition hover:bg-[#f6efe5]">
                    {item.status === "active" ? "Gyors inaktiválás" : "Gyors aktiválás"}
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[18px] border-2 border-dashed border-[#cdbda8] bg-[#fff8ee] px-4 py-5 text-base font-medium leading-8 text-[#44382e]">
            Még nincs beimportált árlista. A következő lépésben a meglévő
            költségvetésből kiválasztjuk, melyik fülekből legyenek egységárak.
          </div>
        )}
      </section>
    </main>
  );
}
