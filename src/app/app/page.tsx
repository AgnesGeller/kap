import Link from "next/link";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

const mainLinks = [
  {
    href: "/app/mukodes",
    title: "Munkalap",
    text: "Napi munka és bevétel rögzítése.",
    primary: true,
  },
  {
    href: "/app/bevetelek",
    title: "Bevételek",
    text: "Bevételi lista, keresés, javítás.",
  },
  {
    href: "/app/kiadasok",
    title: "Kiadások",
    text: "Számlák, nettó, áfa, bruttó.",
  },
  {
    href: "/app/munkavallaloi-koltsegek",
    title: "Munkavállalói költségek",
    text: "Fizetések és téli pénzek egy helyen.",
  },
  {
    href: "/app/ugyfelek",
    title: "Ügyfélnyilvántartás",
    text: "Ügyfelek felvitele, módosítása, törlése.",
  },
  {
    href: "/app/statisztika",
    title: "Statisztika",
    text: "Napi, havi, éves kimutatások külön oldalon.",
  },
];

export default async function AdminPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  return (
    <main className="flex w-full flex-1 flex-col gap-5">
      {params.message ? (
        <div className="rounded-[20px] border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-base font-semibold text-emerald-950">
          {params.message}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-[20px] border-2 border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold text-rose-950">
          {params.error}
        </div>
      ) : null}

      <section className="rounded-[30px] border-2 border-[#cdbda8] bg-[#fffaf3] p-6 shadow-[0_18px_50px_rgba(26,20,16,0.08)] lg:p-8">
        <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#123f2d]">
          KAP központ
        </p>
        <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#17130f] lg:text-5xl">
          Pénzügyi Admin Platform.
        </h1>
        <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-[#44382e]">
          Gyors belépés a napi munkához. A pénzügyi számok és kimutatások külön
          statisztika oldalon vannak.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app/mukodes"
            className="inline-flex rounded-full bg-[#123f2d] px-6 py-3 text-base font-bold text-white shadow-[0_12px_26px_rgba(5,15,12,0.18)] transition hover:bg-[#1d4d39]"
          >
            Munkalap megnyitása
          </Link>
          <Link
            href="/app/statisztika"
            className="inline-flex rounded-full border-2 border-[#bfa988] bg-white px-6 py-3 text-base font-bold text-[#1f1a15] transition hover:border-[#1e5a40] hover:bg-[#f6efe5]"
          >
            Statisztika
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mainLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-[24px] border-2 p-5 shadow-[0_14px_36px_rgba(26,20,16,0.07)] transition hover:-translate-y-0.5 ${
              item.primary
                ? "border-[#123f2d] bg-[#123f2d] text-white"
                : "border-[#d3c3ad] bg-white text-[#17130f] hover:border-[#1e5a40]"
            }`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                item.primary ? "text-emerald-100" : "text-[#674b25]"
              }`}
            >
              {item.primary ? "Elsődleges" : "Modul"}
            </p>
            <h2 className="mt-3 text-2xl font-bold">{item.title}</h2>
            <p
              className={`mt-3 text-sm font-semibold leading-6 ${
                item.primary ? "text-white/75" : "text-[#5f5144]"
              }`}
            >
              {item.text}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
