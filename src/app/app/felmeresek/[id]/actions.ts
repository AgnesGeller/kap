"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const allowedStatuses = new Set([
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

function createQuoteNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.toISOString().slice(11, 19).replaceAll(":", "");

  return `AJ-${date}-${time}`;
}

export async function updateSurveyStatus(formData: FormData) {
  const surveyId = getString(formData.get("surveyId"));
  const status = getString(formData.get("status"));

  if (!surveyId || !allowedStatuses.has(status)) {
    redirect("/app?error=Hib%C3%A1s%20st%C3%A1tusz%20vagy%20felm%C3%A9r%C3%A9s%20azonos%C3%ADt%C3%B3.");
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
      `/app/felmeresek/${surveyId}?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
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
    redirect(`/app/felmeresek/${surveyId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath(`/app/felmeresek/${surveyId}`);
  redirect(
    `/app/felmeresek/${surveyId}?message=${encodeURIComponent("Státusz elmentve.")}`,
  );
}

export async function createQuoteFromSurvey(formData: FormData) {
  const surveyId = getString(formData.get("surveyId"));

  if (!surveyId) {
    redirect("/app?error=Hi%C3%A1nyz%C3%B3%20felm%C3%A9r%C3%A9s%20azonos%C3%ADt%C3%B3.");
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
      `/app/felmeresek/${surveyId}?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  const { data: survey, error: surveyError } = await supabase
    .from("site_surveys")
    .select("id, company_id, client_id, title, service_keys, estimated_total")
    .eq("id", surveyId)
    .eq("company_id", profile.company_id)
    .single();

  if (surveyError || !survey) {
    redirect(
      `/app/felmeresek/${surveyId}?error=${encodeURIComponent("A felmérés nem található vagy nem olvasható.")}`,
    );
  }

  const serviceKeys = Array.isArray(survey.service_keys) ? survey.service_keys : [];
  const lineItems = serviceKeys.map((service: string) => ({
    name: service,
    quantity: 1,
    unit: "csomag",
    unitPrice: 0,
    total: 0,
    note: "Ár kitöltése később",
  }));
  const title = `${survey.title || "Mentett felmérés"} - ajánlat vázlat`;

  const { error: quoteError } = await supabase.from("quotes").insert({
    company_id: profile.company_id,
    survey_id: survey.id,
    client_id: survey.client_id,
    created_by: user.id,
    quote_number: createQuoteNumber(),
    title,
    status: "draft",
    line_items: lineItems,
    subtotal: survey.estimated_total ?? 0,
    total: survey.estimated_total ?? 0,
    notes: "Felmérésből automatikusan előkészített ajánlat vázlat.",
  });

  if (quoteError) {
    redirect(`/app/felmeresek/${surveyId}?error=${encodeURIComponent(quoteError.message)}`);
  }

  await supabase
    .from("site_surveys")
    .update({ status: "quoted", last_saved_at: new Date().toISOString() })
    .eq("id", surveyId)
    .eq("company_id", profile.company_id);

  revalidatePath("/app");
  revalidatePath("/app/ajanlatok");
  revalidatePath(`/app/felmeresek/${surveyId}`);
  redirect(
    `/app/felmeresek/${surveyId}?message=${encodeURIComponent("Ajánlat vázlat létrehozva.")}`,
  );
}
