"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const allowedQuoteStatuses = new Set([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "archived",
]);

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: FormDataEntryValue | null) {
  const raw = getString(value).replace(/\s/g, "").replace(",", ".");
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function getAllStrings(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => getString(value));
}

function buildLineItems(formData: FormData) {
  const names = getAllStrings(formData, "itemName");
  const units = getAllStrings(formData, "itemUnit");
  const notes = getAllStrings(formData, "itemNote");
  const quantities = formData.getAll("itemQuantity");
  const unitPrices = formData.getAll("itemUnitPrice");
  const rowCount = Math.max(
    names.length,
    units.length,
    notes.length,
    quantities.length,
    unitPrices.length,
  );

  return Array.from({ length: rowCount })
    .map((_, index) => {
      const name = names[index] ?? "";
      const quantity = getNumber(quantities[index] ?? null) || 1;
      const unit = units[index] || "db";
      const unitPrice = getNumber(unitPrices[index] ?? null);
      const note = notes[index] ?? "";
      const total = Math.round(quantity * unitPrice);

      return {
        name,
        quantity,
        unit,
        unitPrice,
        total,
        note: note || null,
      };
    })
    .filter(
      (item) =>
        item.name || item.unitPrice > 0 || Boolean(item.note),
    );
}

export async function updateQuote(formData: FormData) {
  const quoteId = getString(formData.get("quoteId"));
  const quoteNumber = getString(formData.get("quoteNumber"));
  const title = getString(formData.get("title"));
  const status = getString(formData.get("status"));
  const manualSubtotal = getNumber(formData.get("subtotal"));
  const vatRate = getNumber(formData.get("vatRate"));
  const notes = getString(formData.get("notes"));
  const lineItems = buildLineItems(formData);
  const subtotalFromItems = lineItems.reduce((sum, item) => sum + item.total, 0);
  const subtotal = lineItems.length ? subtotalFromItems : manualSubtotal;
  const total = Math.round(subtotal * (1 + vatRate / 100));

  if (!quoteId || !title || !allowedQuoteStatuses.has(status)) {
    redirect(
      `/app/ajanlatok/${quoteId || ""}?error=${encodeURIComponent("Hiányzó cím vagy hibás státusz.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?message=Bejelentkez%C3%A9s%20sz%C3%BCks%C3%A9ges.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    redirect(
      `/app/ajanlatok/${quoteId}?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  const { error } = await supabase
    .from("quotes")
    .update({
      quote_number: quoteNumber || null,
      title,
      status,
      line_items: lineItems,
      subtotal,
      vat_rate: vatRate,
      total,
      notes: notes || null,
    })
    .eq("id", quoteId)
    .eq("company_id", profile.company_id);

  if (error) {
    redirect(`/app/ajanlatok/${quoteId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/ajanlatok");
  revalidatePath(`/app/ajanlatok/${quoteId}`);
  redirect(`/app/ajanlatok/${quoteId}?message=${encodeURIComponent("Ajánlat elmentve.")}`);
}
