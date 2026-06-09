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
  if (!hasSupabaseEnv()) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
        <section className="rounded-[32px] border border-amber-200 bg-white p-8 shadow-[0_20px_60px_rgba(26,20,16,0.06)]">
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-900">
            Supabase beállítás szükséges
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#1f1a15] lg:text-4xl">
            Az admin nézet még nincs összekötve a Supabase projekttel.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#615345]">
            Hozd létre a <code>.env.local</code> fájlt, és add meg a két
            publikus Supabase értéket.
          </p>

          <div className="mt-8 rounded-[24px] border border-[#ece3d7] bg-[#fcf8f2] p-5">
            <p className="text-sm font-semibold text-[#1f1a15]">
              Szükséges változók
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
              Vissza a főoldalra
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex rounded-full bg-[#1e5a40] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#184a34]"
            >
              Belépési oldal
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
    redirect(
      `/auth/sign-in?message=${encodeURIComponent("Bejelentkezés szükséges.")}`,
    );
  }

  const profileQuery = supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const { data: profile } = await withTimeout(
    profileQuery,
    {
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as Awaited<typeof profileQuery>,
    3500,
  );
  const isStaff = profile?.role === "staff";
  const navItems = isStaff
    ? [{ href: "/app/mukodes", label: "Munkalap" }]
    : [
        { href: "/app/mukodes", label: "Munkalap" },
        { href: "/app/bevetelek", label: "Bevételek" },
        { href: "/app/kiadasok", label: "Kiadások" },
        {
          href: "/app/munkavallaloi-koltsegek",
          label: "Munkavállalói költségek",
        },
        { href: "/app/ugyfelek", label: "Ügyfélnyilvántartás" },
        { href: "/app/statisztika", label: "Statisztika" },
      ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:px-8">
      <div className="rounded-[22px] border-2 border-[#d3c3ad] bg-[#fffaf3] p-3 shadow-[0_12px_32px_rgba(26,20,16,0.06)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#674b25]">
              Belépve
            </p>
            <h2 className="mt-1 break-all text-base font-bold text-[#17130f]">
              {profile?.full_name || user.email}
            </h2>
            {isStaff ? (
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#1e5a40]">
                Csak munkalap hozzáférés
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-3 py-2 text-sm font-bold text-[#1f1a15] transition hover:border-[#1e5a40] hover:bg-[#f6efe5]"
              >
                {item.label}
              </Link>
            ))}
            <form action={signOut}>
              <button className="inline-flex rounded-full bg-[#1e5a40] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#184a34]">
                Kijelentkezés
              </button>
            </form>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
