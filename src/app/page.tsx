import Link from "next/link";

export default function Home() {
  const eyebrow = "\u00daj alap a KAP rendszerhez";
  const title =
    "Felm\u00e9r\u00e9sb\u0151l m\u0171k\u00f6d\u0151 admin rendszert \u00e9p\u00edt\u00fcnk, nem csak egy \u00fajabb \u0171rlapot.";
  const description =
    "Ez lesz a tiszta term\u00e9kalap. A r\u00e9gi protot\u00edpus marad referenci\u00e1nak, az \u00faj rendszer pedig eleve ment\u00e9ssel, felhaszn\u00e1l\u00f3kkal \u00e9s admin fel\u00fclettel indul.";
  const surveyFormLabel = "Felm\u00e9r\u0151 \u0171rlap";
  const adminHomeLabel = "Admin kezd\u0151n\u00e9zet";
  const signInLabel = "Bel\u00e9p\u00e9s";
  const buildEyebrow = "Els\u0151 build c\u00e9l";
  const buildTitle = "MVP ir\u00e1ny";
  const buildSteps = [
    "Felm\u00e9r\u0151 \u0171rlap \u00fajra\u00e9p\u00edt\u00e9se letisztult, menthet\u0151 folyamattal.",
    "Supabase alapok: felhaszn\u00e1l\u00f3k, c\u00e9gek, mentett felm\u00e9r\u00e9sek.",
    "Admin dashboard: \u00fcgyf\u00e9llista, st\u00e1tuszok, aj\u00e1nlatok, k\u00f6lts\u00e9gadatok.",
  ];

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,_#091411_0%,_#10201a_36%,_#f5efe5_36%,_#f5efe5_100%)]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 pb-16 pt-16 lg:px-10 lg:pb-24 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
              {eyebrow}
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/felmero"
                className="inline-flex items-center justify-center rounded-full bg-emerald-300 px-6 py-3 text-sm font-semibold text-[#0b1a16] transition hover:bg-emerald-200"
              >
                {surveyFormLabel}
              </Link>
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-full border border-white/14 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/30 hover:bg-white/4"
              >
                {adminHomeLabel}
              </Link>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center rounded-full border border-white/14 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/30 hover:bg-white/4"
              >
                {signInLabel}
              </Link>
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/78">
                  {buildEyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {buildTitle}
                </h2>
              </div>
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                v0.1
              </div>
            </div>

            <div className="space-y-4">
              {buildSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-2xl border border-white/8 bg-black/12 px-4 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-sm font-semibold text-[#0b1a16]">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-white/76">{step}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
