import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { withTimeout } from "@/lib/async";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type LayoutProps = {
  children: React.ReactNode;
};

export default async function AppLayout({ children }: LayoutProps) {
  const setupEyebrow = "Supabase setup szükséges";
  const setupTitle =
    "Az admin nézet még nincs összekötve a Supabase projekttel.";
  const setupBody =
    "Ezért most nem engedjük runtime hibára futni az oldalt. A következő lépés a `.env.local` létrehozása és a két publikus Supabase kulcs beírása.";
  const requiredVarsLabel = "Szükséges változók";
  const backHomeLabel = "Vissza a főoldalra";
  const signInPageLabel = "Belépési oldal";
  const signInRequiredMessage = "Bejelentkezés szükséges.";
  const signedInUserLabel = "Bejelentkezett felhasználó";
  const userCardBody =
    "Innen indul a céges admin, mentett felmérésekkel és ügyféladatokkal.";
  const surveyFormLabel = "Felmérő űrlap";
  const clientsLabel = "Ügyfelek";
  const quotesLabel = "Ajánlatok";
  const priceListLabel = "Árlista";
  const signOutLabel = "Kijelentkezés";

  if (!hasSupabaseEnv()) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
        <section className="rounded-[32px] border border-amber-200 bg-white p-8 shadow-[0_20px_60px_rgba(26,20,16,0.06)]">
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-900">
            {setupEyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#1f1a15] lg:text-4xl">
            {setupTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#615345]">
            {setupBody}
          </p>

          <div className="mt-8 rounded-[24px] border border-[#ece3d7] bg-[#fcf8f2] p-5">
            <p className="text-sm font-semibold text-[#1f1a15]">
              {requiredVarsLabel}
            </p>
            <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[#10201a] px-4 py-4 text-sm leading-7 text-emerald-100">
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex rounded-full border border-[#d8ccbc] px-5 py-3 text-sm font-semibold text-[#2a211a] transition hover:border-[#bfa988] hover:bg-[#f6efe5]"
            >
              {backHomeLabel}
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex rounded-full bg-[#1e5a40] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#184a34]"
            >
              {signInPageLabel}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await withTimeout(
    supabase.auth.getUser(),
    { data: { user: null }, error: null } as unknown as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >,
    5000,
  );
  const user = data.user;

  if (!user) {
    redirect(`/auth/sign-in?message=${encodeURIComponent(signInRequiredMessage)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-6 lg:px-10">
      <div className="flex flex-col gap-4 rounded-[24px] border-2 border-[#d3c3ad] bg-[#fffaf3] p-5 shadow-[0_16px_44px_rgba(26,20,16,0.07)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#674b25]">
            {signedInUserLabel}
          </p>
          <h2 className="mt-2 break-all text-xl font-bold text-[#17130f]">
            {user.email}
          </h2>
          <p className="mt-1 text-sm font-medium leading-7 text-[#44382e]">
            {userCardBody}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/ugyfelek"
            className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
          >
            {clientsLabel}
          </Link>
          <Link
            href="/app/ajanlatok"
            className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
          >
            {quotesLabel}
          </Link>
          <Link
            href="/app/arlista"
            className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-5 py-3 text-sm font-bold text-[#1f1a15] transition hover:bg-[#f6efe5]"
          >
            {priceListLabel}
          </Link>
          <Link
            href="/felmero"
            className="inline-flex rounded-full bg-[#123f2d] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
          >
            {surveyFormLabel}
          </Link>
          <form action={signOut}>
            <button className="inline-flex rounded-full bg-[#1e5a40] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#184a34]">
              {signOutLabel}
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  );
}
