"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const allowedStatuses = new Set(["active", "inactive", "archived"]);

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: FormDataEntryValue | null) {
  const raw = getString(value).replace(/\s/g, "").replace(",", ".");
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

async function getCompanyId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?message=Bejelentkez%C3%A9s%20sz%C3%BCks%C3%A9ges.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (error || !profile?.company_id) {
    redirect(
      `/app/arlista?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  return { supabase, companyId: profile.company_id };
}

export async function createPriceItem(formData: FormData) {
  const name = getString(formData.get("name"));
  const category = getString(formData.get("category"));
  const unit = getString(formData.get("unit")) || "db";
  const unitPrice = getNumber(formData.get("unitPrice"));
  const vatRate = getNumber(formData.get("vatRate")) || 27;
  const notes = getString(formData.get("notes"));

  if (!name) {
    redirect(`/app/arlista?error=${encodeURIComponent("A tétel neve kötelező.")}`);
  }

  const { supabase, companyId } = await getCompanyId();

  const { error } = await supabase.from("price_items").insert({
    company_id: companyId,
    name,
    category: category || null,
    unit,
    unit_price: unitPrice,
    vat_rate: vatRate,
    status: "active",
    notes: notes || null,
    source: "manual",
  });

  if (error) {
    redirect(`/app/arlista?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/arlista");
  redirect(`/app/arlista?message=${encodeURIComponent("Árlista tétel elmentve.")}`);
}

export async function updatePriceItemStatus(formData: FormData) {
  const priceItemId = getString(formData.get("priceItemId"));
  const status = getString(formData.get("status"));
  const returnTo = getString(formData.get("returnTo"));
  const safeReturnTo = returnTo.startsWith("/app/arlista") ? returnTo : "/app/arlista";

  if (!priceItemId || !allowedStatuses.has(status)) {
    redirect(
      `${safeReturnTo}?error=${encodeURIComponent("Hibás árlista tétel vagy státusz.")}`,
    );
  }

  const { supabase, companyId } = await getCompanyId();

  const { error } = await supabase
    .from("price_items")
    .update({ status })
    .eq("id", priceItemId)
    .eq("company_id", companyId);

  if (error) {
    redirect(`${safeReturnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/arlista");
  redirect(`${safeReturnTo}?message=${encodeURIComponent("Árlista státusz frissítve.")}`);
}

export async function updatePriceItem(formData: FormData) {
  const priceItemId = getString(formData.get("priceItemId"));
  const name = getString(formData.get("name"));
  const category = getString(formData.get("category"));
  const unit = getString(formData.get("unit")) || "db";
  const unitPrice = getNumber(formData.get("unitPrice"));
  const vatRate = getNumber(formData.get("vatRate")) || 27;
  const status = getString(formData.get("status")) || "active";
  const notes = getString(formData.get("notes"));
  const returnTo = getString(formData.get("returnTo"));
  const safeReturnTo = returnTo.startsWith("/app/arlista") ? returnTo : "/app/arlista";

  if (!priceItemId || !name || !allowedStatuses.has(status)) {
    redirect(
      `${safeReturnTo}?error=${encodeURIComponent("Hiányzó tételnév vagy hibás státusz.")}`,
    );
  }

  const { supabase, companyId } = await getCompanyId();

  const { error } = await supabase
    .from("price_items")
    .update({
      name,
      category: category || null,
      unit,
      unit_price: unitPrice,
      vat_rate: vatRate,
      status,
      notes: notes || null,
    })
    .eq("id", priceItemId)
    .eq("company_id", companyId);

  if (error) {
    redirect(`${safeReturnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/arlista");
  redirect(`${safeReturnTo}?message=${encodeURIComponent("Árlista tétel frissítve.")}`);
}
