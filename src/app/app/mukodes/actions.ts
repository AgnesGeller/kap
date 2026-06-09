"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getWorkbookExpenseEntries,
  getWorkbookIncomeEntries,
  getWorkbookPayrollEntries,
} from "@/lib/budget/workbookData";
import { createClient } from "@/lib/supabase/server";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: FormDataEntryValue | null) {
  const raw = getString(value).replace(/\s/g, "").replace(",", ".");
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function normalizeTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const normalized = normalizeTime(value);
  if (!normalized) return null;

  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

function getDurationHours(startedAt: string, finishedAt: string) {
  const startMinutes = timeToMinutes(startedAt);
  let finishMinutes = timeToMinutes(finishedAt);

  if (startMinutes === null || finishMinutes === null) return 0;

  if (finishMinutes < startMinutes) {
    finishMinutes += 24 * 60;
  }

  return Math.max((finishMinutes - startMinutes) / 60, 0);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeImportKey(value: string) {
  return value.toLocaleLowerCase("hu-HU").replace(/\s+/g, " ").trim();
}

function getSafeReturnTo(value: string, fallback: string) {
  return value.startsWith("/app/") ? value : fallback;
}

function withMessage(returnTo: string, message: string) {
  const [pathAndQuery, hash = ""] = returnTo.split("#");
  const separator = pathAndQuery.includes("?") ? "&" : "?";

  return `${pathAndQuery}${separator}message=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`;
}

function getExpenseImportKey(expense: {
  vendor_name?: string | null;
  item_name?: string | null;
  expense_date?: string | null;
  gross_amount?: number | string | null;
  invoice_number?: string | null;
}) {
  const invoiceNumber = normalizeImportKey(expense.invoice_number ?? "");

  if (invoiceNumber) {
    return `invoice:${invoiceNumber}`;
  }

  return [
    normalizeImportKey(expense.vendor_name ?? ""),
    normalizeImportKey(expense.item_name ?? ""),
    String(expense.expense_date ?? "").slice(0, 10),
    Number(expense.gross_amount ?? 0).toFixed(2),
  ].join("|");
}

function getIncomeImportKey(income: {
  customer_name?: string | null;
  income_date?: string | null;
  calculated_amount?: number | string | null;
  amount?: number | string | null;
  invoice_number?: string | null;
}) {
  const invoiceNumber = normalizeImportKey(income.invoice_number ?? "");

  if (invoiceNumber) {
    return `invoice:${invoiceNumber}`;
  }

  return [
    normalizeImportKey(income.customer_name ?? ""),
    String(income.income_date ?? "").slice(0, 10),
    Number(income.calculated_amount ?? income.amount ?? 0).toFixed(2),
    Number(income.amount ?? 0).toFixed(2),
  ].join("|");
}

function getPayrollImportKey(payroll: {
  employee_name?: string | null;
  payroll_date?: string | null;
  normal_days?: number | string | null;
  normal_hours?: number | string | null;
  overtime_hours?: number | string | null;
  total_amount?: number | string | null;
}) {
  return [
    normalizeImportKey(payroll.employee_name ?? ""),
    String(payroll.payroll_date ?? "").slice(0, 10),
    Number(payroll.normal_days ?? 0).toFixed(2),
    Number(payroll.normal_hours ?? 0).toFixed(2),
    Number(payroll.overtime_hours ?? 0).toFixed(2),
    Number(payroll.total_amount ?? 0).toFixed(2),
  ].join("|");
}

async function getCompanyContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?message=Bejelentkez%C3%A9s%20sz%C3%BCks%C3%A9ges.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", user.id)
    .single();

  if (error || !profile?.company_id) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  if (user.email?.toLocaleLowerCase("hu-HU") === "teszt@teszt.com") {
    const { data: company } = await supabase
      .from("companies")
      .select("slug")
      .eq("id", profile.company_id)
      .maybeSingle();

    if (company?.slug !== "teszt-ceg") {
      redirect(
        `/app/mukodes?error=${encodeURIComponent("A teszt fiók nincs a teszt céghez kötve. Supabase profil javítás szükséges.")}`,
      );
    }
  }

  return { supabase, companyId: profile.company_id, profileId: profile.id, role: profile.role };
}

export async function createWorkLog(formData: FormData) {
  const clientId = getString(formData.get("clientId"));
  const customerName = getString(formData.get("customerName"));
  const siteAddress = getString(formData.get("siteAddress"));
  const customerPhone = getString(formData.get("customerPhone"));
  const customerEmail = getString(formData.get("customerEmail"));
  let taskSummary = getString(formData.get("taskSummary"));
  const workDate = getString(formData.get("workDate"));
  const crewNames = formData.getAll("crewName").map(getString);
  const crewCounts = formData.getAll("crewCount").map(getNumber);
  const startedAts = formData.getAll("startedAt").map(getString);
  const finishedAts = formData.getAll("finishedAt").map(getString);
  const hourlyRates = formData.getAll("hourlyRate").map(getNumber);
  const crewSegments = crewNames
    .map((name, index) => {
      const startedAt = normalizeTime(startedAts[index] ?? "");
      const finishedAt = normalizeTime(finishedAts[index] ?? "");
      const workHours = getDurationHours(startedAt, finishedAt);
      const crewCount = crewCounts[index] || 1;
      const hourlyRate = hourlyRates[index] || 8000;
      const crewHours = crewCount * workHours;

      return {
        name: name || `${index + 1}. csapat`,
        crewCount,
        startedAt,
        finishedAt,
        workHours,
        crewHours,
        hourlyRate,
        laborTotal: crewHours * hourlyRate,
      };
    })
    .filter((crew) => crew.startedAt && crew.finishedAt && crew.workHours);
  const crewCount = crewSegments.reduce((sum, crew) => sum + crew.crewCount, 0) || 1;
  const workHours = crewSegments.reduce((sum, crew) => sum + crew.crewHours, 0);
  const hourlyRate = workHours
    ? crewSegments.reduce((sum, crew) => sum + crew.laborTotal, 0) / workHours
    : 8000;
  const startedAt = crewSegments[0]?.startedAt ?? "";
  const finishedAt = crewSegments[crewSegments.length - 1]?.finishedAt ?? "";
  const itemNames = formData.getAll("itemName").map(getString);
  const itemQuantities = formData.getAll("itemQuantity").map(getNumber);
  const itemUnits = formData.getAll("itemUnit").map(getString);
  const itemUnitPrices = formData.getAll("itemUnitPrice").map(getNumber);
  const items = itemNames
    .map((name, index) => ({
      name,
      quantity: itemQuantities[index] ?? 0,
      unit: itemUnits[index] || "db",
      unitPrice: itemUnitPrices[index] ?? 0,
      totalAmount: (itemQuantities[index] ?? 0) * (itemUnitPrices[index] ?? 0),
    }))
    .filter((item) => item.name && item.quantity);
  taskSummary =
    taskSummary ||
    items
      .map((item) => item.name)
      .filter(Boolean)
      .slice(0, 6)
      .join(", ");
  const materialTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const isFlatRate = getString(formData.get("isFlatRate")) === "on";
  const notes = getString(formData.get("notes"));
  const laborTotal = crewSegments.reduce((sum, crew) => sum + crew.laborTotal, 0);
  const totalAmount = laborTotal + materialTotal;
  const enrichedNotes = [
    customerPhone ? `Telefon: ${customerPhone}` : "",
    customerEmail ? `Email: ${customerEmail}` : "",
    notes,
  ]
    .filter(Boolean)
    .join("\n");

  if (!customerName || !taskSummary) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("A munkalaphoz legalább ügyfél és feladat szükséges.")}`,
    );
  }

  if (!crewSegments.length) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("Legalább egy csapatnál add meg a kezdés és végzés idejét.")}`,
    );
  }

  const { supabase, companyId, profileId } = await getCompanyContext();
  let savedClientId = isUuid(clientId) ? clientId : null;

  if (!savedClientId) {
    const { data: existingClient, error: existingClientError } = await supabase
      .from("clients")
      .select("id")
      .eq("company_id", companyId)
      .ilike("name", customerName)
      .maybeSingle();

    if (existingClientError) {
      redirect(`/app/mukodes?error=${encodeURIComponent(existingClientError.message)}`);
    }

    if (existingClient?.id) {
      savedClientId = existingClient.id;
    } else {
      const { data: newClient, error: newClientError } = await supabase
        .from("clients")
        .insert({
          company_id: companyId,
          name: customerName,
          email: customerEmail || null,
          phone: customerPhone || null,
          billing_address: siteAddress || null,
          project_address: siteAddress || null,
          notes: notes || "Munkalaprol felveve",
        })
        .select("id")
        .single();

      if (newClientError) {
        redirect(`/app/mukodes?error=${encodeURIComponent(newClientError.message)}`);
      }

      savedClientId = newClient?.id ?? null;
    }
  }

  const { data: workLog, error } = await supabase
    .from("work_logs")
    .insert({
      company_id: companyId,
      client_id: savedClientId,
      created_by: profileId,
      customer_name: customerName,
      site_address: siteAddress || null,
      task_summary: taskSummary,
      work_date: workDate || new Date().toISOString().slice(0, 10),
      crew_count: crewCount,
      started_at: startedAt || null,
      finished_at: finishedAt || null,
      work_hours: workHours,
      hourly_rate: hourlyRate,
      labor_total: laborTotal,
      material_total: materialTotal,
      total_amount: totalAmount,
      is_flat_rate: isFlatRate,
      status: "completed",
      notes: enrichedNotes || null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  if (items.length && workLog?.id) {
    const { error: itemError } = await supabase.from("work_log_items").insert(
      items.map((item) => ({
        company_id: companyId,
        work_log_id: workLog.id,
        category: "elszámolás",
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total_amount: item.totalAmount,
      })),
    );

    if (itemError) {
      redirect(`/app/mukodes?error=${encodeURIComponent(itemError.message)}`);
    }
  }

  if (crewSegments.length && workLog?.id) {
    const { error: crewError } = await supabase.from("work_log_crew_segments").insert(
      crewSegments.map((crew) => ({
        company_id: companyId,
        work_log_id: workLog.id,
        crew_name: crew.name,
        crew_count: crew.crewCount,
        started_at: crew.startedAt,
        finished_at: crew.finishedAt,
        work_hours: crew.workHours,
        crew_hours: crew.crewHours,
        hourly_rate: crew.hourlyRate,
        labor_total: crew.laborTotal,
      })),
    );

    if (crewError) {
      redirect(`/app/mukodes?error=${encodeURIComponent(crewError.message)}`);
    }
  }

  if (workLog?.id && totalAmount > 0) {
    const { error: incomeError } = await supabase.from("income_entries").insert({
      company_id: companyId,
      client_id: savedClientId,
      work_log_id: workLog.id,
      income_date: workDate || new Date().toISOString().slice(0, 10),
      customer_name: customerName,
      site_address: siteAddress || null,
      description: taskSummary,
      calculated_amount: totalAmount,
      amount: totalAmount,
      status: "unpaid",
      payment_method: null,
      invoice_number: null,
      is_flat_rate: isFlatRate,
      is_vat_invoice: false,
      notes: "Automatikusan munkalapból létrehozva.",
    });

    if (incomeError) {
      redirect(`/app/mukodes?error=${encodeURIComponent(incomeError.message)}`);
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  revalidatePath("/app/bevetelek");
  redirect(`/app/mukodes?message=${encodeURIComponent("Munkalap elmentve.")}`);
}

export async function createIncomeEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/mukodes");
  const customerName = getString(formData.get("customerName"));
  const siteAddress = getString(formData.get("siteAddress"));
  const description = getString(formData.get("description"));
  const incomeDate = getString(formData.get("incomeDate"));
  const amount = getNumber(formData.get("amount"));
  const status = getString(formData.get("status")) || "unpaid";
  const paymentMethod = getString(formData.get("paymentMethod"));
  const invoiceNumber = getString(formData.get("invoiceNumber"));
  const isFlatRate = getString(formData.get("isFlatRate")) === "on";
  const isVatInvoice = getString(formData.get("isVatInvoice")) === "on";
  const vatRate = getNumber(formData.get("vatRate")) || 27;
  const notes = getString(formData.get("notes"));
  const vatAmount = isVatInvoice ? amount - amount / (1 + vatRate / 100) : 0;
  const netAmount = amount - vatAmount;
  const enrichedNotes = [
    isVatInvoice
      ? `Nettó: ${Math.round(netAmount)} Ft | ÁFA: ${Math.round(vatAmount)} Ft | Bruttó: ${Math.round(amount)} Ft`
      : "",
    notes,
  ]
    .filter(Boolean)
    .join("\n");

  if (!customerName || !amount) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("A bevételhez ügyfél és összeg szükséges.")}`,
    );
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase.from("income_entries").insert({
    company_id: companyId,
    customer_name: customerName,
    site_address: siteAddress || null,
    description: description || null,
    income_date: incomeDate || new Date().toISOString().slice(0, 10),
    calculated_amount: amount,
    amount,
    status,
    payment_method: paymentMethod || null,
    invoice_number: invoiceNumber || null,
    is_flat_rate: isFlatRate,
    is_vat_invoice: isVatInvoice,
    notes: enrichedNotes || null,
  });

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  revalidatePath("/app/bevetelek");
  redirect(withMessage(returnTo, "Bevétel elmentve."));
}

export async function importWorkbookIncomes() {
  const workbookIncomes = getWorkbookIncomeEntries();

  if (!workbookIncomes.length) {
    redirect(`/app/bevetelek?error=${encodeURIComponent("Nincs betölthető bevétel.")}`);
  }

  const { supabase, companyId } = await getCompanyContext();
  const { data: existingIncomes, error: existingError } = await supabase
    .from("income_entries")
    .select("customer_name, income_date, calculated_amount, amount, invoice_number")
    .eq("company_id", companyId)
    .limit(5000);

  if (existingError) {
    redirect(`/app/bevetelek?error=${encodeURIComponent(existingError.message)}`);
  }

  const existingKeys = new Set(
    (existingIncomes ?? []).map((income) => getIncomeImportKey(income)),
  );
  const rowsToInsert = workbookIncomes
    .filter((income) => {
      const key = getIncomeImportKey({
        customer_name: income.customerName,
        income_date: income.incomeDate,
        calculated_amount: income.calculatedAmount,
        amount: income.amount,
        invoice_number: income.invoiceNumber,
      });

      if (existingKeys.has(key)) {
        return false;
      }

      existingKeys.add(key);
      return true;
    })
    .map((income) => ({
      company_id: companyId,
      income_date: income.incomeDate,
      customer_name: income.customerName,
      site_address: income.siteAddress || null,
      description: income.description || null,
      calculated_amount: income.calculatedAmount,
      amount: income.amount,
      status: income.status,
      payment_method: income.paymentMethod,
      invoice_number: income.invoiceNumber || null,
      is_vat_invoice: income.isVatInvoice,
      notes: income.notes || null,
    }));

  if (!rowsToInsert.length) {
    redirect(`/app/bevetelek?message=${encodeURIComponent("Minden bevétel már szerepel a listában.")}`);
  }

  const { error } = await supabase.from("income_entries").insert(rowsToInsert);

  if (error) {
    redirect(`/app/bevetelek?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  revalidatePath("/app/bevetelek");
  redirect(
    `/app/bevetelek?message=${encodeURIComponent(`${rowsToInsert.length} bevétel betöltve.`)}#lista`,
  );
}

export async function createExpenseEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/mukodes");
  const vendorName = getString(formData.get("vendorName"));
  const itemName = getString(formData.get("itemName"));
  const expenseDate = getString(formData.get("expenseDate"));
  const grossAmount = getNumber(formData.get("grossAmount"));
  const vatRate = getNumber(formData.get("vatRate")) || 27;
  const expenseType = getString(formData.get("expenseType")) || "operating";
  const paymentMethod = getString(formData.get("paymentMethod"));
  const invoiceNumber = getString(formData.get("invoiceNumber"));
  const notes = getString(formData.get("notes"));
  const vatAmount = grossAmount - grossAmount / (1 + vatRate / 100);

  if (!vendorName || !itemName || !grossAmount) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("A kiadáshoz szállító, tétel és összeg szükséges.")}`,
    );
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase.from("expense_entries").insert({
    company_id: companyId,
    vendor_name: vendorName,
    item_name: itemName,
    expense_date: expenseDate || new Date().toISOString().slice(0, 10),
    gross_amount: grossAmount,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    expense_type: expenseType,
    payment_method: paymentMethod || null,
    invoice_number: invoiceNumber || null,
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  revalidatePath("/app/kiadasok");
  redirect(withMessage(returnTo, "Kiadás elmentve."));
}

export async function importWorkbookExpenses() {
  const workbookExpenses = getWorkbookExpenseEntries();

  if (!workbookExpenses.length) {
    redirect(`/app/kiadasok?error=${encodeURIComponent("Nincs betölthető kiadás.")}`);
  }

  const { supabase, companyId } = await getCompanyContext();
  const { data: existingExpenses, error: existingError } = await supabase
    .from("expense_entries")
    .select("vendor_name, item_name, expense_date, gross_amount, invoice_number")
    .eq("company_id", companyId)
    .limit(5000);

  if (existingError) {
    redirect(`/app/kiadasok?error=${encodeURIComponent(existingError.message)}`);
  }

  const existingKeys = new Set(
    (existingExpenses ?? []).map((expense) => getExpenseImportKey(expense)),
  );
  const rowsToInsert = workbookExpenses
    .filter((expense) => {
      const key = getExpenseImportKey({
        vendor_name: expense.vendorName,
        item_name: expense.itemName,
        expense_date: expense.expenseDate,
        gross_amount: expense.grossAmount,
        invoice_number: expense.invoiceNumber,
      });

      if (existingKeys.has(key)) {
        return false;
      }

      existingKeys.add(key);
      return true;
    })
    .map((expense) => ({
      company_id: companyId,
      expense_date: expense.expenseDate,
      vendor_name: expense.vendorName,
      item_name: expense.itemName,
      gross_amount: expense.grossAmount,
      vat_rate: expense.vatRate,
      vat_amount: expense.vatAmount,
      expense_type: expense.expenseType,
      payment_method: expense.paymentMethod,
      is_reconciled: expense.isReconciled,
      invoice_number: expense.invoiceNumber || null,
      notes: expense.notes || null,
    }));

  if (!rowsToInsert.length) {
    redirect(`/app/kiadasok?message=${encodeURIComponent("Minden kiadás már szerepel a listában.")}#lista`);
  }

  const { error } = await supabase.from("expense_entries").insert(rowsToInsert);

  if (error) {
    redirect(`/app/kiadasok?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  revalidatePath("/app/kiadasok");
  redirect(
    `/app/kiadasok?message=${encodeURIComponent(`${rowsToInsert.length} kiadás betöltve.`)}#lista`,
  );
}

export async function createEmployee(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/mukodes");
  const name = getString(formData.get("name"));
  const roleTitle = getString(formData.get("roleTitle"));
  const phone = getString(formData.get("phone"));
  const dailyRate = getNumber(formData.get("dailyRate"));
  const hourlyRate = getNumber(formData.get("hourlyRate"));
  const overtimeRate = getNumber(formData.get("overtimeRate")) || 5000;
  const notes = getString(formData.get("notes"));

  if (!name) {
    redirect(`/app/mukodes?error=${encodeURIComponent("A dolgozó neve kötelező.")}`);
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase.from("employees").insert({
    company_id: companyId,
    name,
    role_title: roleTitle || null,
    phone: phone || null,
    daily_rate: dailyRate,
    hourly_rate: hourlyRate,
    overtime_rate: overtimeRate,
    status: "active",
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/mukodes");
  revalidatePath("/app/munkavallaloi-koltsegek");
  redirect(withMessage(returnTo, "Dolgozó elmentve."));
}

export async function createPayrollEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/mukodes");
  const employeeId = getString(formData.get("employeeId"));
  const payrollDate = getString(formData.get("payrollDate"));
  const normalDays = getNumber(formData.get("normalDays"));
  const normalHours = getNumber(formData.get("normalHours"));
  const overtimeHours = getNumber(formData.get("overtimeHours"));
  const dailyRate = getNumber(formData.get("dailyRate"));
  const hourlyRate = getNumber(formData.get("hourlyRate"));
  const overtimeRate = getNumber(formData.get("overtimeRate")) || 5000;
  const bonusAmount = getNumber(formData.get("bonusAmount"));
  const advanceAmount = getNumber(formData.get("advanceAmount"));
  const loanRepaymentAmount = getNumber(formData.get("loanRepaymentAmount"));
  const customAmount = getNumber(formData.get("customAmount"));
  const notes = getString(formData.get("notes"));
  const grossEarnings =
    normalDays * dailyRate +
    normalHours * hourlyRate +
    overtimeHours * overtimeRate +
    bonusAmount +
    customAmount;
  const totalAmount = Math.max(grossEarnings - advanceAmount - loanRepaymentAmount, 0);

  if (!employeeId) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("Fizetés rögzítéséhez előbb válassz dolgozót.")}`,
    );
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase.from("employee_payroll_entries").insert({
    company_id: companyId,
    employee_id: employeeId,
    payroll_date: payrollDate || new Date().toISOString().slice(0, 10),
    normal_days: normalDays,
    normal_hours: normalHours,
    overtime_hours: overtimeHours,
    daily_rate: dailyRate,
    hourly_rate: hourlyRate,
    overtime_rate: overtimeRate,
    bonus_amount: bonusAmount,
    advance_amount: advanceAmount,
    loan_repayment_amount: loanRepaymentAmount,
    custom_amount: customAmount,
    total_amount: totalAmount,
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  revalidatePath("/app/munkavallaloi-koltsegek");
  redirect(withMessage(returnTo, "Fizetés elmentve."));
}

export async function importWorkbookPayrollEntries() {
  const workbookPayrollRows = getWorkbookPayrollEntries();

  if (!workbookPayrollRows.length) {
    redirect(
      `/app/munkavallaloi-koltsegek?error=${encodeURIComponent("Nincs betölthető munkavállalói költség.")}`,
    );
  }

  const { supabase, companyId } = await getCompanyContext();
  const { data: existingEmployees, error: employeesError } = await supabase
    .from("employees")
    .select("id, name")
    .eq("company_id", companyId)
    .limit(1000);

  if (employeesError) {
    redirect(`/app/munkavallaloi-koltsegek?error=${encodeURIComponent(employeesError.message)}`);
  }

  const employeeByName = new Map(
    (existingEmployees ?? []).map((employee) => [
      normalizeImportKey(String(employee.name ?? "")),
      String(employee.id),
    ]),
  );
  const missingEmployees = Array.from(
    new Map(
      workbookPayrollRows
        .filter((row) => !employeeByName.has(normalizeImportKey(row.employeeName)))
        .map((row) => [
          normalizeImportKey(row.employeeName),
          {
            company_id: companyId,
            name: row.employeeName,
            daily_rate: row.dailyRate,
            hourly_rate: row.hourlyRate,
            overtime_rate: row.overtimeRate || 5000,
            status: "active",
          },
        ]),
    ).values(),
  );

  if (missingEmployees.length) {
    const { data: insertedEmployees, error: insertEmployeeError } = await supabase
      .from("employees")
      .insert(missingEmployees)
      .select("id, name");

    if (insertEmployeeError) {
      redirect(
        `/app/munkavallaloi-koltsegek?error=${encodeURIComponent(insertEmployeeError.message)}`,
      );
    }

    for (const employee of insertedEmployees ?? []) {
      employeeByName.set(normalizeImportKey(String(employee.name ?? "")), String(employee.id));
    }
  }

  const { data: existingPayrollRows, error: payrollError } = await supabase
    .from("employee_payroll_entries")
    .select("payroll_date, normal_days, normal_hours, overtime_hours, total_amount, employees(name)")
    .eq("company_id", companyId)
    .limit(10000);

  if (payrollError) {
    redirect(`/app/munkavallaloi-koltsegek?error=${encodeURIComponent(payrollError.message)}`);
  }

  const existingKeys = new Set(
    (existingPayrollRows ?? []).map((row) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;

      return getPayrollImportKey({
        employee_name: employee?.name ?? "",
        payroll_date: row.payroll_date,
        normal_days: row.normal_days,
        normal_hours: row.normal_hours,
        overtime_hours: row.overtime_hours,
        total_amount: row.total_amount,
      });
    }),
  );
  const rowsToInsert = workbookPayrollRows
    .filter((row) => {
      const key = getPayrollImportKey({
        employee_name: row.employeeName,
        payroll_date: row.payrollDate,
        normal_days: row.normalDays,
        normal_hours: row.normalHours,
        overtime_hours: row.overtimeHours,
        total_amount: row.totalAmount,
      });

      if (existingKeys.has(key)) {
        return false;
      }

      existingKeys.add(key);
      return true;
    })
    .map((row) => ({
      company_id: companyId,
      employee_id: employeeByName.get(normalizeImportKey(row.employeeName)),
      payroll_date: row.payrollDate,
      normal_days: row.normalDays,
      normal_hours: row.normalHours,
      overtime_hours: row.overtimeHours,
      daily_rate: row.dailyRate,
      hourly_rate: row.hourlyRate,
      overtime_rate: row.overtimeRate || 5000,
      bonus_amount: row.bonusAmount,
      custom_amount: row.customAmount,
      total_amount: row.totalAmount,
      notes: row.notes || null,
    }))
    .filter((row) => row.employee_id);

  if (!rowsToInsert.length) {
    redirect(
      `/app/munkavallaloi-koltsegek?message=${encodeURIComponent("Minden munkavállalói költség már szerepel a listában.")}`,
    );
  }

  const { error } = await supabase.from("employee_payroll_entries").insert(rowsToInsert);

  if (error) {
    redirect(`/app/munkavallaloi-koltsegek?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/munkavallaloi-koltsegek");
  redirect(
    `/app/munkavallaloi-koltsegek?message=${encodeURIComponent(`${rowsToInsert.length} munkavállalói költség betöltve.`)}`,
  );
}

export async function updateIncomeEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/bevetelek");
  const id = getString(formData.get("id"));
  const amount = getNumber(formData.get("amount"));
  const vatRate = getNumber(formData.get("vatRate")) || 27;
  const isVatInvoice = getString(formData.get("isVatInvoice")) === "on";
  const vatAmount = isVatInvoice ? amount - amount / (1 + vatRate / 100) : 0;
  const netAmount = amount - vatAmount;
  const notes = getString(formData.get("notes"));
  const enrichedNotes = [
    isVatInvoice
      ? `Nettó: ${Math.round(netAmount)} Ft | ÁFA: ${Math.round(vatAmount)} Ft | Bruttó: ${Math.round(amount)} Ft`
      : "",
    notes,
  ]
    .filter(Boolean)
    .join("\n");

  if (!isUuid(id)) {
    redirect(withMessage(returnTo, "Érvénytelen bevétel azonosító."));
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase
    .from("income_entries")
    .update({
      income_date: getString(formData.get("incomeDate")) || new Date().toISOString().slice(0, 10),
      customer_name: getString(formData.get("customerName")),
      site_address: getString(formData.get("siteAddress")) || null,
      description: getString(formData.get("description")) || null,
      calculated_amount: amount,
      amount,
      status: getString(formData.get("status")) || "unpaid",
      payment_method: getString(formData.get("paymentMethod")) || null,
      invoice_number: getString(formData.get("invoiceNumber")) || null,
      is_vat_invoice: isVatInvoice,
      notes: enrichedNotes || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    redirect(withMessage(returnTo, error.message));
  }

  revalidatePath("/app");
  revalidatePath("/app/bevetelek");
  redirect(withMessage(returnTo, "Bevétel módosítva."));
}

export async function updateExpenseEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/kiadasok");
  const id = getString(formData.get("id"));
  const grossAmount = getNumber(formData.get("grossAmount"));
  const vatRate = getNumber(formData.get("vatRate")) || 27;
  const vatAmount = grossAmount - grossAmount / (1 + vatRate / 100);

  if (!isUuid(id)) {
    redirect(withMessage(returnTo, "Érvénytelen kiadás azonosító."));
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase
    .from("expense_entries")
    .update({
      expense_date: getString(formData.get("expenseDate")) || new Date().toISOString().slice(0, 10),
      vendor_name: getString(formData.get("vendorName")),
      item_name: getString(formData.get("itemName")),
      gross_amount: grossAmount,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      expense_type: getString(formData.get("expenseType")) || "operating",
      payment_method: getString(formData.get("paymentMethod")) || null,
      invoice_number: getString(formData.get("invoiceNumber")) || null,
      notes: getString(formData.get("notes")) || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    redirect(withMessage(returnTo, error.message));
  }

  revalidatePath("/app");
  revalidatePath("/app/kiadasok");
  redirect(withMessage(returnTo, "Kiadás módosítva."));
}

export async function updatePayrollEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(
    getString(formData.get("returnTo")),
    "/app/munkavallaloi-koltsegek",
  );
  const id = getString(formData.get("id"));
  const employeeId = getString(formData.get("employeeId"));
  const normalDays = getNumber(formData.get("normalDays"));
  const normalHours = getNumber(formData.get("normalHours"));
  const overtimeHours = getNumber(formData.get("overtimeHours"));
  const dailyRate = getNumber(formData.get("dailyRate"));
  const hourlyRate = getNumber(formData.get("hourlyRate"));
  const overtimeRate = getNumber(formData.get("overtimeRate")) || 5000;
  const bonusAmount = getNumber(formData.get("bonusAmount"));
  const advanceAmount = getNumber(formData.get("advanceAmount"));
  const loanRepaymentAmount = getNumber(formData.get("loanRepaymentAmount"));
  const customAmount = getNumber(formData.get("customAmount"));
  const grossEarnings =
    normalDays * dailyRate +
    normalHours * hourlyRate +
    overtimeHours * overtimeRate +
    bonusAmount +
    customAmount;
  const totalAmount = Math.max(grossEarnings - advanceAmount - loanRepaymentAmount, 0);

  if (!isUuid(id) || !isUuid(employeeId)) {
    redirect(withMessage(returnTo, "Érvénytelen fizetés azonosító."));
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase
    .from("employee_payroll_entries")
    .update({
      employee_id: employeeId,
      payroll_date: getString(formData.get("payrollDate")) || new Date().toISOString().slice(0, 10),
      normal_days: normalDays,
      normal_hours: normalHours,
      overtime_hours: overtimeHours,
      daily_rate: dailyRate,
      hourly_rate: hourlyRate,
      overtime_rate: overtimeRate,
      bonus_amount: bonusAmount,
      advance_amount: advanceAmount,
      loan_repayment_amount: loanRepaymentAmount,
      custom_amount: customAmount,
      total_amount: totalAmount,
      notes: getString(formData.get("notes")) || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    redirect(withMessage(returnTo, error.message));
  }

  revalidatePath("/app");
  revalidatePath("/app/munkavallaloi-koltsegek");
  redirect(withMessage(returnTo, "Fizetés módosítva."));
}

export async function updateWorkLog(formData: FormData) {
  const id = getString(formData.get("id"));
  const customerName = getString(formData.get("customerName"));
  const siteAddress = getString(formData.get("siteAddress"));
  let taskSummary = getString(formData.get("taskSummary"));
  const workDate = getString(formData.get("workDate"));
  const crewNames = formData.getAll("crewName").map(getString);
  const crewCounts = formData.getAll("crewCount").map(getNumber);
  const startedAts = formData.getAll("startedAt").map(getString);
  const finishedAts = formData.getAll("finishedAt").map(getString);
  const hourlyRates = formData.getAll("hourlyRate").map(getNumber);
  const itemNames = formData.getAll("itemName").map(getString);
  const itemQuantities = formData.getAll("itemQuantity").map(getNumber);
  const itemUnits = formData.getAll("itemUnit").map(getString);
  const itemUnitPrices = formData.getAll("itemUnitPrice").map(getNumber);
  const items = itemNames
    .map((name, index) => ({
      name,
      quantity: itemQuantities[index] ?? 0,
      unit: itemUnits[index] || "db",
      unitPrice: itemUnitPrices[index] ?? 0,
      totalAmount: (itemQuantities[index] ?? 0) * (itemUnitPrices[index] ?? 0),
    }))
    .filter((item) => item.name && item.quantity);
  const crewSegments = crewNames
    .map((name, index) => {
      const startedAt = normalizeTime(startedAts[index] ?? "");
      const finishedAt = normalizeTime(finishedAts[index] ?? "");
      const workHours = getDurationHours(startedAt, finishedAt);
      const crewCount = crewCounts[index] || 1;
      const hourlyRate = hourlyRates[index] || 8000;
      const crewHours = crewCount * workHours;

      return {
        name: name || `${index + 1}. csapat`,
        crewCount,
        startedAt,
        finishedAt,
        workHours,
        crewHours,
        hourlyRate,
        laborTotal: crewHours * hourlyRate,
      };
    })
    .filter((crew) => crew.name && crew.startedAt && crew.finishedAt && crew.workHours);
  taskSummary =
    taskSummary ||
    items
      .map((item) => item.name)
      .filter(Boolean)
      .slice(0, 6)
      .join(", ");
  const crewCount = crewSegments.reduce((sum, crew) => sum + crew.crewCount, 0) || 1;
  const workHours = crewSegments.reduce((sum, crew) => sum + crew.crewHours, 0);
  const hourlyRate = workHours
    ? crewSegments.reduce((sum, crew) => sum + crew.laborTotal, 0) / workHours
    : 8000;
  const startedAt = crewSegments[0]?.startedAt ?? "";
  const finishedAt = crewSegments[crewSegments.length - 1]?.finishedAt ?? "";
  const laborTotal = crewSegments.reduce((sum, crew) => sum + crew.laborTotal, 0);
  const materialTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalAmount = laborTotal + materialTotal;
  const isFlatRate = getString(formData.get("isFlatRate")) === "on";
  const notes = getString(formData.get("notes"));

  if (!isUuid(id)) {
    redirect(`/app/mukodes?error=${encodeURIComponent("Érvénytelen munkalap azonosító.")}`);
  }

  if (!customerName || !taskSummary) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("A módosításhoz ügyfél és elvégzett munka szükséges.")}`,
    );
  }

  const { supabase, companyId, profileId, role } = await getCompanyContext();
  let allowedWorkLogQuery = supabase
    .from("work_logs")
    .select("id")
    .eq("id", id)
    .eq("company_id", companyId);

  if (role === "staff") {
    allowedWorkLogQuery = allowedWorkLogQuery.eq("created_by", profileId);
  }

  const { data: allowedWorkLog, error: allowedWorkLogError } = await allowedWorkLogQuery.maybeSingle();

  if (allowedWorkLogError || !allowedWorkLog) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("Ezt a munkalapot nem lehet módosítani ezzel a felhasználóval.")}`,
    );
  }

  let workLogUpdate = supabase
    .from("work_logs")
    .update({
      customer_name: customerName,
      site_address: siteAddress || null,
      task_summary: taskSummary,
      work_date: workDate || new Date().toISOString().slice(0, 10),
      crew_count: crewCount,
      started_at: startedAt || null,
      finished_at: finishedAt || null,
      work_hours: workHours,
      hourly_rate: hourlyRate,
      labor_total: laborTotal,
      material_total: materialTotal,
      total_amount: totalAmount,
      is_flat_rate: isFlatRate,
      notes: notes || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (role === "staff") {
    workLogUpdate = workLogUpdate.eq("created_by", profileId);
  }

  const { error } = await workLogUpdate;

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  const { error: deleteItemsError } = await supabase
    .from("work_log_items")
    .delete()
    .eq("work_log_id", id)
    .eq("company_id", companyId);

  if (deleteItemsError) {
    redirect(`/app/mukodes?error=${encodeURIComponent(deleteItemsError.message)}`);
  }

  if (items.length) {
    const { error: itemError } = await supabase.from("work_log_items").insert(
      items.map((item) => ({
        company_id: companyId,
        work_log_id: id,
        category: "elszámolás",
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total_amount: item.totalAmount,
      })),
    );

    if (itemError) {
      redirect(`/app/mukodes?error=${encodeURIComponent(itemError.message)}`);
    }
  }

  const { error: deleteCrewError } = await supabase
    .from("work_log_crew_segments")
    .delete()
    .eq("work_log_id", id)
    .eq("company_id", companyId);

  if (deleteCrewError) {
    redirect(`/app/mukodes?error=${encodeURIComponent(deleteCrewError.message)}`);
  }

  if (crewSegments.length) {
    const { error: crewError } = await supabase.from("work_log_crew_segments").insert(
      crewSegments.map((crew) => ({
        company_id: companyId,
        work_log_id: id,
        crew_name: crew.name,
        crew_count: crew.crewCount,
        started_at: crew.startedAt,
        finished_at: crew.finishedAt,
        work_hours: crew.workHours,
        crew_hours: crew.crewHours,
        hourly_rate: crew.hourlyRate,
        labor_total: crew.laborTotal,
      })),
    );

    if (crewError) {
      redirect(`/app/mukodes?error=${encodeURIComponent(crewError.message)}`);
    }
  }

  const { error: incomeError } = await supabase
    .from("income_entries")
    .update({
      customer_name: customerName,
      site_address: siteAddress || null,
      description: taskSummary,
      income_date: workDate || new Date().toISOString().slice(0, 10),
      calculated_amount: totalAmount,
      amount: totalAmount,
    })
    .eq("work_log_id", id)
    .eq("company_id", companyId);

  if (incomeError) {
    redirect(`/app/mukodes?error=${encodeURIComponent(incomeError.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  revalidatePath("/app/bevetelek");
  redirect(`/app/mukodes?message=${encodeURIComponent("Munkalap módosítva.")}`);
}

async function deleteCompanyScopedRow(tableName: string, id: string) {
  if (!isUuid(id)) {
    redirect(`/app/mukodes?error=${encodeURIComponent("Érvénytelen törlési azonosító.")}`);
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
}

export async function deleteWorkLog(formData: FormData) {
  await deleteCompanyScopedRow("work_logs", getString(formData.get("id")));
  redirect(`/app/mukodes?message=${encodeURIComponent("Munkalap törölve.")}`);
}

export async function deleteIncomeEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/mukodes");
  await deleteCompanyScopedRow("income_entries", getString(formData.get("id")));
  revalidatePath("/app/bevetelek");
  redirect(withMessage(returnTo, "Bevétel törölve."));
}

export async function deleteExpenseEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/mukodes");
  await deleteCompanyScopedRow("expense_entries", getString(formData.get("id")));
  revalidatePath("/app/kiadasok");
  redirect(withMessage(returnTo, "Kiadás törölve."));
}

export async function deletePayrollEntry(formData: FormData) {
  const returnTo = getSafeReturnTo(getString(formData.get("returnTo")), "/app/mukodes");
  await deleteCompanyScopedRow("employee_payroll_entries", getString(formData.get("id")));
  revalidatePath("/app/munkavallaloi-koltsegek");
  redirect(withMessage(returnTo, "Fizetés törölve."));
}
