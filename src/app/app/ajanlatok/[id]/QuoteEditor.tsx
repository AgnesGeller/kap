"use client";

import { useState } from "react";

type QuoteLineItem = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note: string;
};

type PriceItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  unit_price: number | null;
  vat_rate: number | null;
};

type QuoteEditorProps = {
  quoteId: string;
  quoteNumber: string;
  title: string;
  status: string;
  subtotal: number;
  vatRate: number;
  notes: string;
  lineItems: QuoteLineItem[];
  priceItems: PriceItem[];
  statuses: Array<{
    value: string;
    label: string;
  }>;
  action: (formData: FormData) => void;
};

function emptyLineItem(): QuoteLineItem {
  return {
    name: "",
    quantity: 1,
    unit: "db",
    unitPrice: 0,
    total: 0,
    note: "",
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value);
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
  defaultValue: string | number;
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

export function QuoteEditor({
  quoteId,
  quoteNumber,
  title,
  status,
  subtotal,
  vatRate,
  notes,
  lineItems,
  priceItems,
  statuses,
  action,
}: QuoteEditorProps) {
  const [rows, setRows] = useState<QuoteLineItem[]>([
    ...lineItems,
    emptyLineItem(),
    emptyLineItem(),
  ]);

  function updateRow(index: number, patch: Partial<QuoteLineItem>) {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const next = { ...row, ...patch };
        return {
          ...next,
          total: Math.round((Number(next.quantity) || 0) * (Number(next.unitPrice) || 0)),
        };
      }),
    );
  }

  function addPriceItem(item: PriceItem) {
    setRows((current) => [
      ...current.filter(
        (row, index) =>
          index < current.length - 2 || row.name || row.unitPrice || row.note,
      ),
      {
        name: item.name,
        quantity: 1,
        unit: item.unit || "db",
        unitPrice: item.unit_price ?? 0,
        total: item.unit_price ?? 0,
        note: item.category ?? "",
      },
      emptyLineItem(),
    ]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  const calculatedSubtotal = rows.reduce((sum, row) => sum + (row.total || 0), 0);
  const calculatedTotal = Math.round(calculatedSubtotal * (1 + vatRate / 100));

  return (
    <form action={action} className="mt-5 grid gap-5">
      <input type="hidden" name="quoteId" value={quoteId} />
      <div className="grid gap-5 md:grid-cols-[0.6fr_1fr]">
        <TextInput
          id="quoteNumber"
          label="Ajánlatszám"
          name="quoteNumber"
          defaultValue={quoteNumber}
        />
        <TextInput id="title" label="Ajánlat címe" name="title" defaultValue={title} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-bold text-[#2a211a]">
            Státusz
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
          >
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <TextInput id="subtotal" label="Nettó összeg" name="subtotal" type="number" defaultValue={subtotal} />
        <TextInput id="vatRate" label="ÁFA %" name="vatRate" type="number" defaultValue={vatRate} />
      </div>

      <div className="rounded-[20px] border-2 border-[#ded0bd] bg-[#fff8ee] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
              Ajánlati tételek
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#44382e]">
              Árlistából beszúrható vagy kézzel kitölthető tételsorok.
            </p>
          </div>
          <div className="rounded-full bg-[#123f2d] px-4 py-2 text-xs font-bold text-white">
            {formatMoney(calculatedSubtotal)} nettó / {formatMoney(calculatedTotal)} bruttó
          </div>
        </div>

        {priceItems.length ? (
          <div className="mt-5 rounded-[18px] border-2 border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-sm font-bold text-[#123f2d]">
              Árlistából beszúrás
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {priceItems.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addPriceItem(item)}
                  className="min-w-56 rounded-[16px] border border-emerald-200 bg-white px-3 py-3 text-left transition hover:border-[#1e5a40] hover:shadow-[0_10px_24px_rgba(5,15,12,0.12)]"
                >
                  <span className="block text-sm font-bold text-[#17130f]">{item.name}</span>
                  <span className="mt-1 block text-xs font-semibold text-[#44382e]">
                    {item.category || "Nincs kategória"}
                  </span>
                  <span className="mt-2 block text-sm font-bold text-[#123f2d]">
                    {formatMoney(item.unit_price ?? 0)} / {item.unit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          {rows.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="grid gap-3 rounded-[18px] border-2 border-[#e3d8c8] bg-white p-4 lg:grid-cols-[1.2fr_0.45fr_0.45fr_0.7fr_auto]"
            >
              <div className="space-y-2">
                <label
                  htmlFor={`itemName-${index}`}
                  className="text-xs font-bold uppercase tracking-[0.14em] text-[#674b25]"
                >
                  Tétel neve
                </label>
                <input
                  id={`itemName-${index}`}
                  name="itemName"
                  value={item.name}
                  onChange={(event) => updateRow(index, { name: event.target.value })}
                  placeholder="Pl. gyepszőnyeg telepítés"
                  className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`itemQuantity-${index}`}
                  className="text-xs font-bold uppercase tracking-[0.14em] text-[#674b25]"
                >
                  Mennyiség
                </label>
                <input
                  id={`itemQuantity-${index}`}
                  name="itemQuantity"
                  type="number"
                  step="0.01"
                  value={item.quantity}
                  onChange={(event) =>
                    updateRow(index, { quantity: Number(event.target.value) })
                  }
                  className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`itemUnit-${index}`}
                  className="text-xs font-bold uppercase tracking-[0.14em] text-[#674b25]"
                >
                  Egység
                </label>
                <input
                  id={`itemUnit-${index}`}
                  name="itemUnit"
                  value={item.unit}
                  onChange={(event) => updateRow(index, { unit: event.target.value })}
                  placeholder="m2, fm, db"
                  className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`itemUnitPrice-${index}`}
                  className="text-xs font-bold uppercase tracking-[0.14em] text-[#674b25]"
                >
                  Egységár
                </label>
                <input
                  id={`itemUnitPrice-${index}`}
                  name="itemUnitPrice"
                  type="number"
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateRow(index, { unitPrice: Number(event.target.value) })
                  }
                  className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-full border border-[#d3c3ad] bg-white px-3 py-2 text-xs font-bold text-[#4c4035] transition hover:bg-[#f6efe5]"
                >
                  Törlés
                </button>
              </div>
              <div className="space-y-2 lg:col-span-5">
                <label
                  htmlFor={`itemNote-${index}`}
                  className="text-xs font-bold uppercase tracking-[0.14em] text-[#674b25]"
                >
                  Megjegyzés
                </label>
                <input
                  id={`itemNote-${index}`}
                  name="itemNote"
                  value={item.note}
                  onChange={(event) => updateRow(index, { note: event.target.value })}
                  placeholder="Rövid belső megjegyzés vagy pontosítás"
                  className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none focus:border-[#1e5a40]"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyLineItem()])}
          className="mt-4 rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
        >
          Új üres sor
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-bold text-[#2a211a]">
          Megjegyzés
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          defaultValue={notes}
          className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
        />
      </div>
      <button className="w-fit rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
        Ajánlat mentése
      </button>
    </form>
  );
}
