"use client";

import { useMemo, useState } from "react";

import { createPayrollEntry } from "@/app/app/mukodes/actions";

export type PayrollEmployeeOption = {
  id: string;
  name: string;
  dailyRate: number;
  hourlyRate: number;
  overtimeRate: number;
};

type PayrollFormProps = {
  employees: PayrollEmployeeOption[];
  today: string;
  returnTo?: string;
};

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

function Field({
  id,
  label,
  name,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  placeholder: string;
  type?: string;
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
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
      />
    </div>
  );
}

export function PayrollForm({
  employees,
  today,
  returnTo = "/app/mukodes",
}: PayrollFormProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [payrollDate, setPayrollDate] = useState(today);
  const [normalDays, setNormalDays] = useState("");
  const [normalHours, setNormalHours] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("5000");
  const [bonusAmount, setBonusAmount] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [loanRepaymentAmount, setLoanRepaymentAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const estimatedTotal = useMemo(() => {
    const gross =
      toNumber(normalDays) * toNumber(dailyRate) +
      toNumber(normalHours) * toNumber(hourlyRate) +
      toNumber(overtimeHours) * toNumber(overtimeRate) +
      toNumber(bonusAmount) +
      toNumber(customAmount);

    return Math.max(gross - toNumber(advanceAmount) - toNumber(loanRepaymentAmount), 0);
  }, [
    advanceAmount,
    bonusAmount,
    customAmount,
    dailyRate,
    hourlyRate,
    loanRepaymentAmount,
    normalDays,
    normalHours,
    overtimeHours,
    overtimeRate,
  ]);

  function handleEmployeeChange(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) return;

    setDailyRate(String(employee.dailyRate || ""));
    setHourlyRate(String(employee.hourlyRate || ""));
    setOvertimeRate(String(employee.overtimeRate || 5000));
  }

  return (
    <form action={createPayrollEntry} className="mt-5 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="space-y-2 md:col-span-2">
        <label htmlFor="employeeId" className="text-sm font-bold text-[#2a211a]">
          Dolgozó
        </label>
        <select
          id="employeeId"
          name="employeeId"
          value={selectedEmployeeId}
          onChange={(event) => handleEmployeeChange(event.target.value)}
          className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition focus:border-[#1e5a40] focus:bg-white"
        >
          <option value="">Válassz dolgozót</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </div>

      <Field
        id="payrollDate"
        label="Dátum"
        name="payrollDate"
        type="date"
        value={payrollDate}
        placeholder=""
        onChange={setPayrollDate}
      />
      <Field
        id="normalDays"
        label="Normál nap"
        name="normalDays"
        value={normalDays}
        placeholder="0"
        onChange={setNormalDays}
      />
      <Field
        id="normalHours"
        label="Normál óra"
        name="normalHours"
        value={normalHours}
        placeholder="0"
        onChange={setNormalHours}
      />
      <Field
        id="overtimeHours"
        label="Túlóra"
        name="overtimeHours"
        value={overtimeHours}
        placeholder="0"
        onChange={setOvertimeHours}
      />
      <Field
        id="payrollDailyRate"
        label="Napi bér"
        name="dailyRate"
        value={dailyRate}
        placeholder="0"
        onChange={setDailyRate}
      />
      <Field
        id="payrollHourlyRate"
        label="Órabér"
        name="hourlyRate"
        value={hourlyRate}
        placeholder="0"
        onChange={setHourlyRate}
      />
      <Field
        id="payrollOvertimeRate"
        label="Túlóra díj"
        name="overtimeRate"
        value={overtimeRate}
        placeholder="5000"
        onChange={setOvertimeRate}
      />
      <Field
        id="bonusAmount"
        label="Bónusz"
        name="bonusAmount"
        value={bonusAmount}
        placeholder="0"
        onChange={setBonusAmount}
      />
      <Field
        id="advanceAmount"
        label="Előleg"
        name="advanceAmount"
        value={advanceAmount}
        placeholder="0"
        onChange={setAdvanceAmount}
      />
      <Field
        id="loanRepaymentAmount"
        label="Törlesztés"
        name="loanRepaymentAmount"
        value={loanRepaymentAmount}
        placeholder="0"
        onChange={setLoanRepaymentAmount}
      />
      <Field
        id="customAmount"
        label="Téli pénz / egyéni összeg"
        name="customAmount"
        value={customAmount}
        placeholder="0"
        onChange={setCustomAmount}
      />

      <div className="space-y-2 md:col-span-2">
        <label htmlFor="payrollNotes" className="text-sm font-bold text-[#2a211a]">
          Megjegyzés
        </label>
        <textarea
          id="payrollNotes"
          name="notes"
          placeholder="Pl. munkaruha, téli pénz részlete, korrekció"
          rows={4}
          className="w-full resize-y rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
        />
      </div>

      <div className="rounded-[18px] border-2 border-emerald-200 bg-emerald-50 px-4 py-4 md:col-span-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#123f2d]">
          Várható kifizetés
        </p>
        <p className="mt-2 text-2xl font-bold text-[#17130f]">
          {formatMoney(estimatedTotal)}
        </p>
        <p className="mt-2 text-sm font-semibold leading-7 text-[#44382e]">
          Nap x napi bér + óra x órabér + túlóra + bónusz + téli pénz / egyéni összeg -
          előleg - törlesztés.
        </p>
      </div>

      <div className="md:col-span-2">
        <button className="rounded-full bg-[#123f2d] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]">
          Fizetés mentése
        </button>
      </div>
    </form>
  );
}
