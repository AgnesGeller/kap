"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getWorkbookCustomerOptions } from "@/lib/budget/workbookData";
import { createClient } from "@/lib/supabase/server";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function getCompanyContext() {
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
      `/app/ugyfelek?error=${encodeURIComponent("Nincs céghez rendelt profil ehhez a felhasználóhoz.")}`,
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
        `/app/ugyfelek?error=${encodeURIComponent("A teszt fiók nincs a teszt céghez kötve. Supabase profil javítás szükséges.")}`,
      );
    }
  }

  return { supabase, companyId: profile.company_id };
}

function normalizeName(value: string) {
  return value.toLocaleLowerCase("hu-HU").trim();
}

function isSampleCustomerName(value: string) {
  const normalized = normalizeName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return ["pelda", "teszt", "test", "minta"].some((word) =>
    normalized.includes(word),
  );
}

export async function createClientRecord(formData: FormData) {
  const name = getString(formData.get("name"));
  const email = getString(formData.get("email"));
  const phone = getString(formData.get("phone"));
  const projectAddress = getString(formData.get("projectAddress"));
  const billingAddress = getString(formData.get("billingAddress"));
  const notes = getString(formData.get("notes"));

  if (!name) {
    redirect(`/app/ugyfelek?error=${encodeURIComponent("Az ügyfél neve kötelező.")}`);
  }

  const { supabase, companyId } = await getCompanyContext();
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      company_id: companyId,
      name,
      email: email || null,
      phone: phone || null,
      project_address: projectAddress || null,
      billing_address: billingAddress || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !client?.id) {
    redirect(
      `/app/ugyfelek?error=${encodeURIComponent(error?.message ?? "Az ügyfél mentése nem sikerült.")}`,
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/ugyfelek");
  redirect(
    `/app/ugyfelek/${client.id}?message=${encodeURIComponent("Új ügyfél elmentve.")}`,
  );
}

export async function importWorkbookClients() {
  const workbookCustomers = getWorkbookCustomerOptions();

  if (!workbookCustomers.length) {
    redirect(`/app/ugyfelek?error=${encodeURIComponent("Nincs betölthető ügyfél.")}`);
  }

  const { supabase, companyId } = await getCompanyContext();
  const { data: existingClients, error: existingError } = await supabase
    .from("clients")
    .select("name")
    .eq("company_id", companyId);

  if (existingError) {
    redirect(`/app/ugyfelek?error=${encodeURIComponent(existingError.message)}`);
  }

  const existingNames = new Set(
    (existingClients ?? []).map((client) => normalizeName(client.name ?? "")),
  );
  const rowsToInsert = workbookCustomers
    .filter(
      (customer) =>
        !isSampleCustomerName(customer.name) &&
        !existingNames.has(normalizeName(customer.name)),
    )
    .map((customer) => ({
      company_id: companyId,
      name: customer.name,
      email: customer.email || null,
      phone: customer.phone || null,
      project_address: customer.address || null,
      billing_address: customer.address || null,
      notes: customer.notes || null,
    }));

  if (!rowsToInsert.length) {
    redirect(`/app/ugyfelek?message=${encodeURIComponent("Minden ügyfél már szerepel a listában.")}`);
  }

  const { error } = await supabase.from("clients").insert(rowsToInsert);

  if (error) {
    redirect(`/app/ugyfelek?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/ugyfelek");
  redirect(
    `/app/ugyfelek?message=${encodeURIComponent(`${rowsToInsert.length} ügyfél betöltve.`)}`,
  );
}

export async function deleteClientRecord(formData: FormData) {
  const clientId = getString(formData.get("clientId"));

  if (!clientId) {
    redirect(`/app/ugyfelek?error=${encodeURIComponent("Hiányzó ügyfél azonosító.")}`);
  }

  const { supabase, companyId } = await getCompanyContext();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("company_id", companyId);

  if (error) {
    redirect(`/app/ugyfelek?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/ugyfelek");
  redirect(`/app/ugyfelek?message=${encodeURIComponent("Ügyfél törölve.")}#ugyfel-lista`);
}
