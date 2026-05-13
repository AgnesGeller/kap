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
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export async function saveSurveyDraft(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/sign-in?message=${encodeURIComponent("Mentett felméréshez bejelentkezés szükséges.")}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    redirect(
      `/auth/sign-in?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  const title = getString(formData.get("title"));
  const clientName = getString(formData.get("clientName"));
  const clientEmail = getString(formData.get("clientEmail"));
  const clientPhone = getString(formData.get("clientPhone"));
  const sourceClientId = getString(formData.get("sourceClientId"));
  const siteAddress = getString(formData.get("siteAddress"));
  const postalCode = getString(formData.get("postalCode"));
  const settlement = getString(formData.get("settlement"));
  const projectGoal = getString(formData.get("projectGoal"));
  const budgetTier = getString(formData.get("budgetTier"));
  const surveyNotes = getString(formData.get("surveyNotes"));
  const estimatedTotal = getNumber(formData.get("estimatedTotal"));
  const serviceKeys = formData
    .getAll("serviceKeys")
    .map((value) => (typeof value === "string" ? value : ""))
    .filter(Boolean);

  const payload = {
    title,
    clientName,
    clientEmail,
    clientPhone,
    sourceClientId,
    siteAddress,
    postalCode,
    settlement,
    projectGoal,
    budgetTier,
    surveyNotes,
    estimatedTotal,
    serviceKeys,
  };

  let clientId: string | null = null;
  let clientError: string | null = null;

  if (sourceClientId) {
    const { data: sourceClient, error: sourceClientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", sourceClientId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (sourceClientError) {
      clientError = sourceClientError.message;
    } else {
      clientId = sourceClient?.id ?? null;
    }
  }

  if (clientName || clientEmail || clientPhone) {
    if (!clientId && clientEmail) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("email", clientEmail)
        .maybeSingle();

      clientId = existingClient?.id ?? null;
    }

    if (clientId) {
      const { error: clientUpdateError } = await supabase
        .from("clients")
        .update({
          name: clientName || clientEmail || clientPhone || "Névtelen ügyfél",
          email: clientEmail || null,
          phone: clientPhone || null,
          project_address: siteAddress || null,
          notes: surveyNotes || null,
        })
        .eq("id", clientId)
        .eq("company_id", profile.company_id);

      if (clientUpdateError) {
        clientError = clientUpdateError.message;
      }
    } else {
      const { data: client, error: clientInsertError } = await supabase
        .from("clients")
        .insert({
          company_id: profile.company_id,
          name: clientName || clientEmail || clientPhone || "Névtelen ügyfél",
          email: clientEmail || null,
          phone: clientPhone || null,
          project_address: siteAddress || null,
          notes: surveyNotes || null,
        })
        .select("id")
        .single();

      if (clientInsertError) {
        clientError = clientInsertError.message;
      } else {
        clientId = client?.id ?? null;
      }
    }
  }

  const { error } = await supabase.from("site_surveys").insert({
    company_id: profile.company_id,
    client_id: clientId,
    created_by: user.id,
    title: title || "Mentett felmérés",
    status: "draft",
    source: "internal",
    site_address: siteAddress,
    postal_code: postalCode,
    settlement,
    project_goal: projectGoal,
    budget_tier: budgetTier,
    service_keys: serviceKeys,
    form_payload: { ...payload, clientError },
    map_payload: {},
    estimated_total: estimatedTotal,
    last_saved_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/felmero?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/ugyfelek");
  if (clientId) {
    revalidatePath(`/app/ugyfelek/${clientId}`);
  }

  redirect(`/app?message=${encodeURIComponent("Felmérés piszkozatként elmentve.")}`);
}
