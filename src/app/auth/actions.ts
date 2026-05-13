"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { withTimeout } from "@/lib/async";
import { createClient } from "@/lib/supabase/server";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(formData: FormData) {
  const email = getString(formData.get("email"));
  const password = getString(formData.get("password"));

  if (!email || !password) {
    redirect(
      `/auth/sign-in?error=${encodeURIComponent("Add meg az email-címet és a jelszót.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await withTimeout(
    supabase.auth.signInWithPassword({ email, password }).then((result) => ({
      error: result.error ? { message: result.error.message } : null,
    })),
    {
      error: {
        message:
          "A belépés túl sokáig tartott. Ellenőrizd az internetet, majd próbáld újra.",
      },
    },
    12000,
  );

  if (error) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/app");
}

export async function signUp(formData: FormData) {
  const email = getString(formData.get("email"));
  const password = getString(formData.get("password"));
  const companyName = getString(formData.get("companyName"));
  const fullName = getString(formData.get("fullName"));

  if (!email || !password) {
    redirect(
      `/auth/sign-up?error=${encodeURIComponent("Add meg az email-címet és a jelszót.")}`,
    );
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        company_name: companyName,
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/sign-in?message=Az%20ellenorzo%20email%20elkuldve.%20Megerosites%20utan%20be%20tudsz%20lepni.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in?message=Sikeres%20kijelentkezes.");
}
