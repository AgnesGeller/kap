import Link from "next/link";

import { signIn } from "@/app/auth/actions";
import { SignInSubmitButton } from "@/app/auth/sign-in/submit-button";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const configured = hasSupabaseEnv();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl items-center px-6 py-12 lg:px-10 lg:py-16">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[32px] bg-[#10201a] p-8 text-white shadow-[0_24px_70px_rgba(10,20,17,0.34)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/78">KAP belépés</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Belépés a KAP rendszerbe.</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/74">
            Napi munkalapok, bevételek, kiadások, munkavállalói költségek és ügyfelek egy helyen.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 text-sm leading-7 text-white/76">
              Csak belépett felhasználó láthatja a saját cégéhez tartozó adatokat.
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#ddd2c4] bg-white p-8 shadow-[0_20px_60px_rgba(26,20,16,0.06)] lg:p-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b6f47]">Belépés</p>
            <h2 className="text-3xl font-semibold text-[#1f1a15]">Folytasd a munkát</h2>
          </div>

          {!configured ? (
            <div className="mt-6 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              A Supabase még nincs beállítva. A login UI kész, de a tényleges belépéshez előbb ki kell tölteni a `.env.local` fájlt.
            </div>
          ) : null}

          {params.error ? (
            <div className="mt-6 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-900">
              {params.error}
            </div>
          ) : null}

          {params.message ? (
            <div className="mt-6 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-900">
              {params.message}
            </div>
          ) : null}

          <form action={signIn} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-[#2a211a]">Email-cím</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={!configured}
                className="w-full rounded-[18px] border border-[#ddd2c4] bg-[#fcf8f2] px-4 py-3 text-sm text-[#1f1a15] outline-none transition focus:border-[#1e5a40] disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="pelda@email.hu"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-[#2a211a]">Jelszó</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={!configured}
                className="w-full rounded-[18px] border border-[#ddd2c4] bg-[#fcf8f2] px-4 py-3 text-sm text-[#1f1a15] outline-none transition focus:border-[#1e5a40] disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Jelszó"
              />
            </div>

            <SignInSubmitButton disabled={!configured} />
          </form>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/auth/sign-up" className="font-semibold text-[#1e5a40] transition hover:text-[#184a34]">
              Új fiók létrehozása
            </Link>
            <span className="text-[#8a7a6a]">•</span>
            <Link href="/" className="font-semibold text-[#6a5b4e] transition hover:text-[#2a211a]">
              Vissza a főoldalra
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
