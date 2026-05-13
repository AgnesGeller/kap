"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const allowedSurveyStatuses = new Set([
  "draft",
  "submitted",
  "in_review",
  "quoted",
  "won",
  "lost",
  "archived",
]);

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateSurveyStatusFromList(formData: FormData) {
  const surveyId = getString(formData.get("surveyId"));
  const status = getString(formData.get("status"));
  const returnTo = getString(formData.get("returnTo"));
  const safeReturnTo = returnTo.startsWith("/app/felmeresek")
    ? returnTo
    : "/app/felmeresek";

  if (!surveyId || !allowedSurveyStatuses.has(status)) {
    redirect(
      `${safeReturnTo}?error=${encodeURIComponent("Hibás felmérés vagy státusz.")}`,
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
    .from("site_surveys")
    .update({
      status,
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .eq("company_id", profile.company_id);

  if (error) {
    redirect(`${safeReturnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/felmeresek");
  revalidatePath(`/app/felmeresek/${surveyId}`);
  redirect(
    `${safeReturnTo}?message=${encodeURIComponent("Felmérés státusz frissítve.")}`,
  );
}
