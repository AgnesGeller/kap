import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import { withTimeout } from "@/lib/async";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KAP",
  description:
    "Felm\u00e9r\u00e9si, aj\u00e1nlatkezel\u00e9si \u00e9s admin rendszer kivitelez\u0151 c\u00e9geknek.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brandLabel = "Kivitelez\u0151i Admin Platform";
  const loggedInLabel = "Bel\u00e9pve";
  const loggedOutLabel = "Nincs bel\u00e9pve";
  const surveyFormLabel = "Felm\u00e9r\u0151 \u0171rlap";

  let userEmail: string | null = null;

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data } = await withTimeout(
      supabase.auth.getUser(),
      { data: { user: null }, error: null } as unknown as Awaited<
        ReturnType<typeof supabase.auth.getUser>
      >,
      3500,
    );

    userEmail = data.user?.email ?? null;
  }

  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#24332c] shadow-[0_10px_30px_rgba(8,18,14,0.18)]">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-10">
              <Link
                href="/"
                className="flex items-center gap-3 text-sm font-bold tracking-[0.16em] text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-500/20 text-base tracking-[0.12em] text-white">
                  KAP
                </span>
                <span className="hidden text-white sm:inline">
                  {brandLabel}
                </span>
              </Link>

              <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                <div
                  className={`inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    userEmail
                      ? "border border-emerald-200 bg-emerald-500/18 text-white"
                      : "border border-amber-200 bg-amber-500/18 text-white"
                  }`}
                >
                  {userEmail
                    ? `${loggedInLabel}: ${userEmail}`
                    : loggedOutLabel}
                </div>
                <nav className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/felmero"
                    className="rounded-full bg-[#0f3f2c] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(5,15,12,0.28)] transition hover:bg-[#1d4d39]"
                  >
                    {surveyFormLabel}
                  </Link>
                  <Link
                    href="/app"
                    className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-bold text-[#0b1a16] transition hover:bg-emerald-200"
                  >
                    Admin
                  </Link>
                </nav>
              </div>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
