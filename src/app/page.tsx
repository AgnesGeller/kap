import Link from "next/link";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,_#091411_0%,_#10201a_38%,_#f5efe5_38%,_#f5efe5_100%)]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-16 pt-16 lg:px-10 lg:pb-24 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
              KAP rendszer
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Napi munkalap, költségvetés és ügyfelek egy helyen.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
                A rendszer a napi munkákból számol bevételt, kiadást, fizetést és
                statisztikát. A cél: gyors rögzítés, tiszta adatok, átlátható működés.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/app/mukodes"
                className="inline-flex items-center justify-center rounded-full bg-emerald-300 px-6 py-3 text-sm font-semibold text-[#0b1a16] transition hover:bg-emerald-200"
              >
                Napi munkalap
              </Link>
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
              >
                Központ
              </Link>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
              >
                Belépés
              </Link>
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-white/8 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
              Fő munkafolyamat
            </p>
            <div className="mt-5 grid gap-3">
              {[
                "Napi munkalap kitöltése",
                "Ügyfél és cím automatikus keresése",
                "Bevétel, költség és fizetés számítása",
                "Havi és éves statisztika",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-black/14 px-4 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-sm font-semibold text-[#0b1a16]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold leading-7 text-white/82">{step}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
