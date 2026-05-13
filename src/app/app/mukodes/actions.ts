"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: FormDataEntryValue | null) {
  const raw = getString(value).replace(/\s/g, "").replace(",", ".");
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : 0;
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
    .select("id, company_id")
    .eq("id", user.id)
    .single();

  if (error || !profile?.company_id) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  return { supabase, companyId: profile.company_id, profileId: profile.id };
}

export async function createWorkLog(formData: FormData) {
  const customerName = getString(formData.get("customerName"));
  const siteAddress = getString(formData.get("siteAddress"));
  const taskSummary = getString(formData.get("taskSummary"));
  const workDate = getString(formData.get("workDate"));
  const crewCount = getNumber(formData.get("crewCount")) || 1;
  const workHours = getNumber(formData.get("workHours"));
  const hourlyRate = getNumber(formData.get("hourlyRate")) || 8000;
  const materialTotal = getNumber(formData.get("materialTotal"));
  const isFlatRate = getString(formData.get("isFlatRate")) === "on";
  const notes = getString(formData.get("notes"));
  const laborTotal = crewCount * workHours * hourlyRate;
  const totalAmount = laborTotal + materialTotal;

  if (!customerName || !taskSummary) {
    redirect(
      `/app/mukodes?error=${encodeURIComponent("A munkalaphoz legalább ügyfél és feladat szükséges.")}`,
    );
  }

  const { supabase, companyId, profileId } = await getCompanyContext();
  const { error } = await supabase.from("work_logs").insert({
    company_id: companyId,
    created_by: profileId,
    customer_name: customerName,
    site_address: siteAddress || null,
    task_summary: taskSummary,
    work_date: workDate || new Date().toISOString().slice(0, 10),
    crew_count: crewCount,
    work_hours: workHours,
    hourly_rate: hourlyRate,
    labor_total: laborTotal,
    material_total: materialTotal,
    total_amount: totalAmount,
    is_flat_rate: isFlatRate,
    status: "completed",
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  redirect(`/app/mukodes?message=${encodeURIComponent("Munkalap elmentve.")}`);
}

export async function createIncomeEntry(formData: FormData) {
  const customerName = getString(formData.get("customerName"));
  const siteAddress = getString(formData.get("siteAddress"));
  const description = getString(formData.get("description"));
  const incomeDate = getString(formData.get("incomeDate"));
  const amount = getNumber(formData.get("amount"));
  const status = getString(formData.get("status")) || "unpaid";
  const paymentMethod = getString(formData.get("paymentMethod"));
  const invoiceNumber = getString(formData.get("invoiceNumber"));
  const isFlatRate = getString(formData.get("isFlatRate")) === "on";
  const notes = getString(formData.get("notes"));

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
    notes: notes || null,
  });

  if (error) {
    redirect(`/app/mukodes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/mukodes");
  redirect(`/app/mukodes?message=${encodeURIComponent("Bevétel elmentve.")}`);
}

export async function createExpenseEntry(formData: FormData) {
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
  redirect(`/app/mukodes?message=${encodeURIComponent("Kiadás elmentve.")}`);
}

export async function createEmployee(formData: FormData) {
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
  redirect(`/app/mukodes?message=${encodeURIComponent("Dolgozó elmentve.")}`);
}

export async function createPayrollEntry(formData: FormData) {
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
  redirect(`/app/mukodes?message=${encodeURIComponent("Fizetés elmentve.")}`);
}
