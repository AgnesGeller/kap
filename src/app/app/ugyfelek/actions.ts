"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
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

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      company_id: profile.company_id,
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
