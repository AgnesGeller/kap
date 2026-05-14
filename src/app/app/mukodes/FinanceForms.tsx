"use client";

import { useMemo, useState } from "react";

import { createExpenseEntry, createIncomeEntry } from "@/app/app/mukodes/actions";

function toNumber(value: string) {
  const number = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value);
}

function MoneySummary({
  grossAmount,
  vatRate,
  showVat = true,
}: {
  grossAmount: number;
  vatRate: number;
  showVat?: boolean;
}) {
  const vatAmount = showVat ? grossAmount - grossAmount / (1 + vatRate / 100) : 0;
  const netAmount = grossAmount - vatAmount;

  return (
    <div className="grid gap-2 rounded-[18px] bg-[#09251b] p-4 text-white sm:grid-cols-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">
          Nettó
        </p>
        <p className="mt-1 text-lg font-bold">{formatMoney(netAmount)}</p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">
          ÁFA
        </p>
        <p className="mt-1 text-lg font-bold">{formatMoney(vatAmount)}</p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">
          Bruttó / végösszeg
        </p>
        <p className="mt-1 text-lg font-bold">{formatMoney(grossAmount)}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        inputMode={type === "text" ? "text" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

function DecimalField({
  id,
  label,
  name,
  value,
  onChange,
  placeholder = "0",
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-[#2a211a]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
      {children}
    </button>
  );
}

export function IncomeForm({
  today,
  returnTo = "/app/mukodes",
}: {
  today: string;
  returnTo?: string;
}) {
  const [incomeDate, setIncomeDate] = useState(today);
  const [customerName, setCustomerName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("27");
  const [isVatInvoice, setIsVatInvoice] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const grossAmount = useMemo(() => toNumber(amount), [amount]);
  const parsedVatRate = useMemo(() => toNumber(vatRate) || 27, [vatRate]);

  return (
    <form action={createIncomeEntry} className="grid gap-3">
      <input type="hidden" name="returnTo" value={returnTo} />
      <Field
        id="incomeDate"
        label="Dátum"
        name="incomeDate"
        type="date"
        value={incomeDate}
        onChange={setIncomeDate}
      />
      <Field
        id="incomeCustomer"
        label="Ügyfél"
        name="customerName"
        value={customerName}
        placeholder="Ügyfél neve"
        onChange={setCustomerName}
      />
      <Field
        id="incomeAddress"
        label="Helyszín"
        name="siteAddress"
        value={siteAddress}
        placeholder="Cím vagy munka"
        onChange={setSiteAddress}
      />
      <DecimalField
        id="incomeAmount"
        label="Beérkezett bruttó összeg"
        name="amount"
        value={amount}
        onChange={setAmount}
      />
      <label className="flex items-center gap-3 rounded-[16px] bg-[#fff8ee] px-4 py-3 text-sm font-bold text-[#2a211a]">
        <input
          type="checkbox"
          name="isVatInvoice"
          checked={isVatInvoice}
          onChange={(event) => setIsVatInvoice(event.target.checked)}
          className="size-4"
        />
        Áfás bevétel
      </label>
      {isVatInvoice ? (
        <DecimalField
          id="incomeVatRate"
          label="ÁFA %"
          name="vatRate"
          value={vatRate}
          onChange={setVatRate}
          placeholder="27"
        />
      ) : null}
      <MoneySummary
        grossAmount={grossAmount}
        vatRate={parsedVatRate}
        showVat={isVatInvoice}
      />
      <select
        id="incomeStatus"
        name="status"
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
        defaultValue="paid"
      >
        <option value="paid">Fizetve</option>
        <option value="unpaid">Nyitott</option>
        <option value="partial">Részben fizetve</option>
        <option value="draft">Piszkozat</option>
      </select>
      <select
        id="paymentMethod"
        name="paymentMethod"
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
        defaultValue=""
      >
        <option value="">Fizetés módja</option>
        <option value="cash">Készpénz</option>
        <option value="transfer">Utalás</option>
        <option value="card">Kártya</option>
        <option value="other">Egyéb</option>
      </select>
      <Field
        id="invoiceNumber"
        label="Számla"
        name="invoiceNumber"
        value={invoiceNumber}
        placeholder="Számlaszám"
        onChange={setInvoiceNumber}
      />
      <textarea
        id="incomeDescription"
        name="description"
        rows={3}
        placeholder="Megjegyzés"
        className="w-full resize-y rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
      <SubmitButton>Bevétel mentése</SubmitButton>
    </form>
  );
}

export function ExpenseForm({
  today,
  returnTo = "/app/mukodes",
}: {
  today: string;
  returnTo?: string;
}) {
  const [expenseDate, setExpenseDate] = useState(today);
  const [vendorName, setVendorName] = useState("");
  const [itemName, setItemName] = useState("");
  const [grossAmountInput, setGrossAmountInput] = useState("");
  const [vatRate, setVatRate] = useState("27");

  const grossAmount = useMemo(() => toNumber(grossAmountInput), [grossAmountInput]);
  const parsedVatRate = useMemo(() => toNumber(vatRate) || 27, [vatRate]);

  return (
    <form action={createExpenseEntry} className="grid gap-3">
      <input type="hidden" name="returnTo" value={returnTo} />
      <Field
        id="expenseDate"
        label="Dátum"
        name="expenseDate"
        type="date"
        value={expenseDate}
        onChange={setExpenseDate}
      />
      <Field
        id="vendorName"
        label="Szállító"
        name="vendorName"
        value={vendorName}
        placeholder="Pl. Shell, OBI"
        onChange={setVendorName}
      />
      <Field
        id="itemName"
        label="Tétel"
        name="itemName"
        value={itemName}
        placeholder="Pl. gázolaj, növény"
        onChange={setItemName}
      />
      <DecimalField
        id="grossAmount"
        label="Bruttó végösszeg"
        name="grossAmount"
        value={grossAmountInput}
        onChange={setGrossAmountInput}
      />
      <DecimalField
        id="vatRate"
        label="ÁFA %"
        name="vatRate"
        value={vatRate}
        onChange={setVatRate}
        placeholder="27"
      />
      <MoneySummary grossAmount={grossAmount} vatRate={parsedVatRate} />
      <select
        id="expenseType"
        name="expenseType"
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
        defaultValue="operating"
      >
        <option value="operating">Működési</option>
        <option value="client">Ügyfélhez tartozik</option>
        <option value="investment">Beruházás</option>
        <option value="other">Egyéb</option>
      </select>
      <select
        id="expensePaymentMethod"
        name="paymentMethod"
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
        defaultValue=""
      >
        <option value="">Fizetés módja</option>
        <option value="cash">Készpénz</option>
        <option value="transfer">Utalás</option>
        <option value="card">Kártya</option>
        <option value="other">Egyéb</option>
      </select>
      <input
        id="expenseInvoiceNumber"
        name="invoiceNumber"
        placeholder="Számlaszám"
        className="w-full rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
      <textarea
        id="expenseNotes"
        name="notes"
        rows={3}
        placeholder="Megjegyzés"
        className="w-full resize-y rounded-[16px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
      <SubmitButton>Kiadás mentése</SubmitButton>
    </form>
  );
}
