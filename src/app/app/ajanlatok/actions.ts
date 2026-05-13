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

export async function updateQuoteStatus(formData: FormData) {
  const quoteId = getString(formData.get("quoteId"));
  const status = getString(formData.get("status"));
  const returnTo = getString(formData.get("returnTo"));
  const safeReturnTo = returnTo.startsWith("/app/ajanlatok")
    ? returnTo
    : "/app/ajanlatok";

  if (!quoteId || !allowedQuoteStatuses.has(status)) {
    redirect(
      `${safeReturnTo}?error=${encodeURIComponent("Hibás ajánlat vagy státusz.")}`,
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
      `${safeReturnTo}?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  const { error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", quoteId)
    .eq("company_id", profile.company_id);

  if (error) {
    redirect(`${safeReturnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/ajanlatok");
  revalidatePath(`/app/ajanlatok/${quoteId}`);
  redirect(`${safeReturnTo}?message=${encodeURIComponent("Ajánlat státusz frissítve.")}`);
}
