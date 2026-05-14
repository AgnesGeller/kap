"use client";

import { useMemo, useState } from "react";

import { createWorkLog } from "@/app/app/mukodes/actions";
import type {
  WorkbookCustomerOption,
  WorkbookPriceItemOption,
} from "@/lib/budget/workbookData";

type WorkLogItem = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

type CrewSegment = {
  id: number;
  name: string;
  crewCount: string;
  startedAt: string;
  finishedAt: string;
  hourlyRate: string;
};

type WorkLogFormProps = {
  today: string;
  taskOptions: string[];
  unitOptions: string[];
  priceOptions: WorkbookPriceItemOption[];
  customerOptions: WorkbookCustomerOption[];
};

const crewNameOptions = [
  "1. csapat",
  "2. csapat",
  "3. csapat",
  "Karbantartó csapat",
  "Építő csapat",
  "Kertész csapat",
  "Segéd csapat",
  "Alvállalkozó",
];

function toNumber(value: string) {
  const number = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatHours(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

function durationHours(startedAt: string, finishedAt: string) {
  const start = parseTime(startedAt);
  let finish = parseTime(finishedAt);

  if (start === null || finish === null) return 0;

  if (finish < start) {
    finish += 24 * 60;
  }

  return Math.max((finish - start) / 60, 0);
}

function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function DecimalField({
  id,
  label,
  name,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
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
        className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

export function WorkLogForm({
  today,
  taskOptions,
  unitOptions,
  priceOptions,
  customerOptions,
}: WorkLogFormProps) {
  const [workDate, setWorkDate] = useState(today);
  const [customerName, setCustomerName] = useState("");
  const [clientId, setClientId] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [taskSummary, setTaskSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [crewSegments, setCrewSegments] = useState<CrewSegment[]>([
    {
      id: 1,
      name: "1. csapat",
      crewCount: "1",
      startedAt: "",
      finishedAt: "",
      hourlyRate: "8000",
    },
  ]);
  const [items, setItems] = useState<WorkLogItem[]>([
    { id: 1, name: "", quantity: "", unit: "db", unitPrice: "" },
  ]);

  const materialTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice),
        0,
      ),
    [items],
  );
  const crewSummary = useMemo(
    () =>
      crewSegments.reduce(
        (summary, crew) => {
          const hours = durationHours(crew.startedAt, crew.finishedAt);
          const count = toNumber(crew.crewCount);
          const hourlyRate = toNumber(crew.hourlyRate);
          const crewHours = count * hours;
          const labor = crewHours * hourlyRate;

          return {
            totalPeople: summary.totalPeople + count,
            totalDuration: summary.totalDuration + hours,
            totalCrewHours: summary.totalCrewHours + crewHours,
            laborTotal: summary.laborTotal + labor,
          };
        },
        {
          totalPeople: 0,
          totalDuration: 0,
          totalCrewHours: 0,
          laborTotal: 0,
        },
      ),
    [crewSegments],
  );
  const grandTotal = crewSummary.laborTotal + materialTotal;
  const matchedCustomers =
    !clientId && customerName.length >= 2
      ? customerOptions
          .filter((customer) => normalize(customer.name).includes(normalize(customerName)))
          .slice(0, 6)
      : [];

  function applyCustomer(customer: WorkbookCustomerOption) {
    setClientId(customer.id);
    setCustomerName(customer.name);
    setSiteAddress(customer.address);
    setCustomerPhone(customer.phone);
    setCustomerEmail(customer.email);
  }

  function handleCustomerChange(value: string) {
    setCustomerName(value);
    setClientId("");

    if (value.length < 2) {
      setSiteAddress("");
      setCustomerPhone("");
      setCustomerEmail("");
      return;
    }
  }

  function clearCustomer() {
    setClientId("");
    setCustomerName("");
    setSiteAddress("");
    setCustomerPhone("");
    setCustomerEmail("");
  }

  function updateCrew(
    id: number,
    field: keyof Omit<CrewSegment, "id">,
    value: string,
  ) {
    setCrewSegments((current) =>
      current.map((crew) => (crew.id === id ? { ...crew, [field]: value } : crew)),
    );
  }

  function addCrew() {
    setCrewSegments((current) => [
      ...current,
      {
        id: Date.now(),
        name: `${current.length + 1}. csapat`,
        crewCount: "1",
        startedAt: "",
        finishedAt: "",
        hourlyRate: "8000",
      },
    ]);
  }

  function removeCrew(id: number) {
    setCrewSegments((current) =>
      current.length === 1 ? current : current.filter((crew) => crew.id !== id),
    );
  }

  function findPriceOption(name: string, unit?: string) {
    const normalizedName = normalize(name);
    const normalizedUnit = normalize(unit ?? "");

    return (
      priceOptions.find(
        (option) =>
          normalize(option.name) === normalizedName &&
          (!normalizedUnit || normalize(option.unit) === normalizedUnit),
      ) ??
      priceOptions.find((option) => normalize(option.name) === normalizedName) ??
      null
    );
  }

  function updateItem(id: number, field: keyof Omit<WorkLogItem, "id">, value: string) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        const next = { ...item, [field]: value };
        const matchedPrice =
          field === "name"
            ? findPriceOption(value, next.unit)
            : field === "unit"
              ? findPriceOption(next.name, value)
              : null;

        if (!matchedPrice) return next;

        return {
          ...next,
          unit: matchedPrice.unit || next.unit,
          unitPrice: matchedPrice.unitPrice ? String(matchedPrice.unitPrice) : next.unitPrice,
        };
      }),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: Date.now(), name: "", quantity: "", unit: "db", unitPrice: "" },
    ]);
  }

  function removeItem(id: number) {
    setItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    );
  }

  return (
    <form action={createWorkLog} className="grid gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <datalist id="work-log-task-options">
        {priceOptions.map((option) => (
          <option
            key={option.id}
            value={option.name}
            label={`${option.unitPrice ? formatMoney(option.unitPrice) : "nincs ár"} / ${option.unit}`}
          />
        ))}
        {taskOptions.map((option) => (
          <option key={`task-${option}`} value={option} />
        ))}
      </datalist>
      <datalist id="work-log-unit-options">
        {unitOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="work-log-crew-options">
        {crewNameOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <section className="rounded-[24px] border-2 border-[#1e5a40] bg-[#f6fff9] p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="workDate" className="text-sm font-bold text-[#2a211a]">
              Dátum
            </label>
            <input
              id="workDate"
              name="workDate"
              type="date"
              value={workDate}
              onChange={(event) => setWorkDate(event.target.value)}
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="workCustomer" className="text-sm font-bold text-[#2a211a]">
                Ügyfél
              </label>
              <button
                type="button"
                onClick={clearCustomer}
                className="text-xs font-bold uppercase tracking-[0.1em] text-[#8a3b24] underline underline-offset-4"
              >
                Ügyfél törlése
              </button>
            </div>
            <input
              id="workCustomer"
              name="customerName"
              value={customerName}
              placeholder="Keress vagy írj új ügyfelet"
              onChange={(event) => handleCustomerChange(event.target.value)}
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
            />
            {clientId ? (
              <p className="rounded-[14px] bg-[#e8f4ec] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#123f2d]">
                Kiválasztott ügyfél
              </p>
            ) : null}
            {!clientId && customerName.length >= 2 && !matchedCustomers.length ? (
              <p className="rounded-[14px] bg-[#fff3d9] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#674b25]">
                Új ügyfélként mentjük
              </p>
            ) : null}
            {matchedCustomers.length ? (
              <div className="rounded-[18px] border border-[#d3c3ad] bg-white p-2">
                {matchedCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => applyCustomer(customer)}
                    className="block w-full rounded-[14px] px-3 py-2 text-left text-sm font-semibold text-[#17130f] transition hover:bg-[#eef8f1]"
                  >
                    {customer.name}
                    {customer.address ? (
                      <span className="block text-xs font-medium text-[#5f5144]">
                        {customer.address}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="workAddress" className="text-sm font-bold text-[#2a211a]">
              Helyszín / cím
            </label>
            <input
              id="workAddress"
              name="siteAddress"
              value={siteAddress}
              placeholder="Automatikusan jön, de javítható"
              onChange={(event) => setSiteAddress(event.target.value)}
              className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="customerPhone" className="text-sm font-bold text-[#2a211a]">
                Telefonszám
              </label>
              <input
                id="customerPhone"
                name="customerPhone"
                value={customerPhone}
                placeholder="Ha van, automatikusan jön"
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="customerEmail" className="text-sm font-bold text-[#2a211a]">
                Email
              </label>
              <input
                id="customerEmail"
                name="customerEmail"
                value={customerEmail}
                placeholder="Ha van, automatikusan jön"
                onChange={(event) => setCustomerEmail(event.target.value)}
                className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-white px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40]"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <label htmlFor="taskSummary" className="text-sm font-bold text-[#2a211a]">
          Elvégzett munka röviden
        </label>
        <textarea
          id="taskSummary"
          name="taskSummary"
          value={taskSummary}
          placeholder="Pl. fűnyírás, sövényvágás, zöldhulladék, permetezés"
          rows={3}
          onChange={(event) => setTaskSummary(event.target.value)}
          className="w-full resize-y rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
        />
      </div>

      <div className="rounded-[22px] border-2 border-[#e0d0ba] bg-[#fffbf4] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#17130f]">Csapatok és idő</h3>
          </div>
          <button
            type="button"
            onClick={addCrew}
            className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d4d39]"
          >
            Csapat hozzáadása
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {crewSegments.map((crew, index) => {
            const hours = durationHours(crew.startedAt, crew.finishedAt);
            const crewHours = toNumber(crew.crewCount) * hours;
            const labor = crewHours * toNumber(crew.hourlyRate);

            return (
              <div
                key={crew.id}
                className="grid gap-3 rounded-[18px] border border-[#e2d4c0] bg-white p-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto_auto]"
              >
                <div className="space-y-2">
                  <label
                    htmlFor={`crewName-${crew.id}`}
                    className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]"
                  >
                    Csapat {index + 1}
                  </label>
                  <input
                    id={`crewName-${crew.id}`}
                    name="crewName"
                    list="work-log-crew-options"
                    value={crew.name}
                    placeholder="Válassz vagy írj csapatnevet"
                    onChange={(event) => updateCrew(crew.id, "name", event.target.value)}
                    className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                  />
                </div>
                <DecimalField
                  id={`crewCount-${crew.id}`}
                  label="Létszám"
                  name="crewCount"
                  value={crew.crewCount}
                  placeholder="1 vagy 1,5"
                  onChange={(value) => updateCrew(crew.id, "crewCount", value)}
                />
                <div className="space-y-2">
                  <label
                    htmlFor={`startedAt-${crew.id}`}
                    className="text-sm font-bold text-[#2a211a]"
                  >
                    Kezdés
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={`startedAt-${crew.id}`}
                      name="startedAt"
                      type="text"
                      inputMode="numeric"
                      value={crew.startedAt}
                      placeholder="08:00"
                      onChange={(event) =>
                        updateCrew(crew.id, "startedAt", event.target.value)
                      }
                      className="min-w-0 flex-1 rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => updateCrew(crew.id, "startedAt", getCurrentTimeValue())}
                      className="rounded-[16px] border-2 border-[#d3c3ad] bg-white px-3 py-2 text-xs font-bold text-[#1f1a15] transition hover:border-[#1e5a40] hover:bg-[#f6efe5]"
                    >
                      Most
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor={`finishedAt-${crew.id}`}
                    className="text-sm font-bold text-[#2a211a]"
                  >
                    Végzés
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={`finishedAt-${crew.id}`}
                      name="finishedAt"
                      type="text"
                      inputMode="numeric"
                      value={crew.finishedAt}
                      placeholder="15:32"
                      onChange={(event) =>
                        updateCrew(crew.id, "finishedAt", event.target.value)
                      }
                      className="min-w-0 flex-1 rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateCrew(crew.id, "finishedAt", getCurrentTimeValue())
                      }
                      className="rounded-[16px] border-2 border-[#d3c3ad] bg-white px-3 py-2 text-xs font-bold text-[#1f1a15] transition hover:border-[#1e5a40] hover:bg-[#f6efe5]"
                    >
                      Most
                    </button>
                  </div>
                </div>
                <DecimalField
                  id={`hourlyRate-${crew.id}`}
                  label="Óradíj"
                  name="hourlyRate"
                  value={crew.hourlyRate}
                  placeholder="8000"
                  onChange={(value) => updateCrew(crew.id, "hourlyRate", value)}
                />
                <div className="rounded-[14px] bg-[#e8f4ec] px-3 py-2 text-sm font-bold text-[#123f2d]">
                  {formatHours(hours)} óra
                  <span className="block text-xs text-[#2d6048]">
                    {formatMoney(labor)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeCrew(crew.id)}
                  className="rounded-full border-2 border-[#d3c3ad] px-3 py-2 text-xs font-bold text-[#3a2d22] transition hover:bg-[#f6efe5]"
                >
                  Törlés
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[22px] border-2 border-[#e0d0ba] bg-[#fffbf4] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#17130f]">Tételek</h3>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d4d39]"
          >
            Tétel hozzáadása
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[760px] space-y-3">
            {items.map((item, index) => {
              const rowTotal = toNumber(item.quantity) * toNumber(item.unitPrice);

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto] items-end gap-3 rounded-[18px] border border-[#e2d4c0] bg-white p-3"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor={`itemName-${item.id}`}
                      className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]"
                    >
                      Tétel {index + 1}
                    </label>
                    <input
                      id={`itemName-${item.id}`}
                      name="itemName"
                      list="work-log-task-options"
                      value={item.name}
                      placeholder="Válassz vagy írj saját tételt"
                      onChange={(event) => updateItem(item.id, "name", event.target.value)}
                      className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`itemQuantity-${item.id}`}
                      className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]"
                    >
                      Mennyiség
                    </label>
                    <input
                      id={`itemQuantity-${item.id}`}
                      name="itemQuantity"
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      placeholder="0"
                      onChange={(event) =>
                        updateItem(item.id, "quantity", event.target.value)
                      }
                      className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`itemUnit-${item.id}`}
                      className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]"
                    >
                      Egység / kiszerelés
                    </label>
                    <input
                      id={`itemUnit-${item.id}`}
                      name="itemUnit"
                      list="work-log-unit-options"
                      value={item.unit}
                      placeholder="pl. 20L zsák"
                      onChange={(event) => updateItem(item.id, "unit", event.target.value)}
                      className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`itemUnitPrice-${item.id}`}
                      className="text-xs font-bold uppercase tracking-[0.1em] text-[#674b25]"
                    >
                      Egységár
                    </label>
                    <input
                      id={`itemUnitPrice-${item.id}`}
                      name="itemUnitPrice"
                      type="text"
                      inputMode="decimal"
                      value={item.unitPrice}
                      placeholder="0"
                      onChange={(event) =>
                        updateItem(item.id, "unitPrice", event.target.value)
                      }
                      className="w-full rounded-[14px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-3 py-2 text-sm font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
                    />
                  </div>
                  <div className="rounded-[14px] bg-[#e8f4ec] px-3 py-2 text-sm font-bold text-[#123f2d]">
                    {formatMoney(rowTotal)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full border-2 border-[#d3c3ad] px-3 py-2 text-xs font-bold text-[#3a2d22] transition hover:bg-[#f6efe5]"
                  >
                    Törlés
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-[18px] bg-[#fff8ee] px-4 py-3 text-sm font-bold text-[#2a211a]">
        <input type="checkbox" name="isFlatRate" className="size-4" />
        Általányos ügyfélhez tartozik
      </label>

      <div className="space-y-2">
        <label htmlFor="workNotes" className="text-sm font-bold text-[#2a211a]">
          Megjegyzés
        </label>
        <textarea
          id="workNotes"
          name="notes"
          value={notes}
          placeholder="Belső megjegyzés, fizetés, számla, külön kérés..."
          rows={3}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full resize-y rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
        />
      </div>

      <section className="rounded-[24px] bg-[#09251b] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
          Munkalap összesítő
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-emerald-100">Csapatmunka</p>
            <p className="mt-1 text-2xl font-bold">
              {formatHours(crewSummary.totalCrewHours)} óra
            </p>
            <p className="mt-1 text-xs text-emerald-100">
              {formatHours(crewSummary.totalDuration)} óra idősáv alapján
            </p>
          </div>
          <div>
            <p className="text-sm text-emerald-100">Munkadíj</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(crewSummary.laborTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-emerald-100">Tételek</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(materialTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-emerald-100">Végösszeg</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(grandTotal)}</p>
          </div>
        </div>
      </section>

      <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
        Munkalap mentése
      </button>
    </form>
  );
}
