"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function createQuoteNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.toISOString().slice(11, 19).replaceAll(":", "");

  return `AJ-${date}-${time}`;
}

export async function updateClient(formData: FormData) {
  const clientId = getString(formData.get("clientId"));
  const name = getString(formData.get("name"));
  const email = getString(formData.get("email"));
  const phone = getString(formData.get("phone"));
  const projectAddress = getString(formData.get("projectAddress"));
  const billingAddress = getString(formData.get("billingAddress"));
  const notes = getString(formData.get("notes"));

  if (!clientId || !name) {
    redirect(
      `/app/ugyfelek/${clientId || ""}?error=${encodeURIComponent("Az ügyfél neve kötelező.")}`,
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
      `/app/ugyfelek/${clientId}?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      email: email || null,
      phone: phone || null,
      project_address: projectAddress || null,
      billing_address: billingAddress || null,
      notes: notes || null,
    })
    .eq("id", clientId)
    .eq("company_id", profile.company_id);

  if (error) {
    redirect(`/app/ugyfelek/${clientId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/ugyfelek");
  revalidatePath(`/app/ugyfelek/${clientId}`);
  redirect(
    `/app/ugyfelek/${clientId}?message=${encodeURIComponent("Ügyféladatok elmentve.")}`,
  );
}

export async function createQuoteForClient(formData: FormData) {
  const clientId = getString(formData.get("clientId"));

  if (!clientId) {
    redirect(`/app/ugyfelek?error=${encodeURIComponent("Hiányzó ügyfél azonosító.")}`);
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
      `/app/ugyfelek/${clientId}?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
    );
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, project_address")
    .eq("id", clientId)
    .eq("company_id", profile.company_id)
    .single();

  if (clientError || !client) {
    redirect(
      `/app/ugyfelek/${clientId}?error=${encodeURIComponent("Az ügyfél nem található ennél a cégnél.")}`,
    );
  }

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      company_id: profile.company_id,
      client_id: client.id,
      created_by: user.id,
      quote_number: createQuoteNumber(),
      title: `${client.name} - ajánlat vázlat`,
      status: "draft",
      line_items: [],
      subtotal: 0,
      vat_rate: 27,
      total: 0,
      notes: client.project_address
        ? `Ügyfél adatlapról indított ajánlat. Projekt cím: ${client.project_address}`
        : "Ügyfél adatlapról indított ajánlat.",
    })
    .select("id")
    .single();

  if (error || !quote?.id) {
    redirect(
      `/app/ugyfelek/${clientId}?error=${encodeURIComponent(error?.message ?? "Az ajánlat létrehozása nem sikerült.")}`,
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/ajanlatok");
  revalidatePath(`/app/ugyfelek/${clientId}`);
  redirect(
    `/app/ajanlatok/${quote.id}?message=${encodeURIComponent("Ajánlatvázlat létrehozva.")}`,
  );
}
