export type BudgetModuleKey =
  | "koltsegvetes"
  | "bevetelek"
  | "elszamolas-kalkulator"
  | "elszamolas-reszletezo"
  | "munkavallaloi-koltsegek"
  | "kiadasok"
  | "fizetesek"
  | "teli-penzek"
  | "ugyfelnyilvantartas";

export type BudgetModule = {
  key: BudgetModuleKey;
  title: string;
  href: string;
  sheetName: string;
  description: string;
  fields: string[];
  calculations: string[];
};

export const budgetModules: BudgetModule[] = [
  {
    key: "koltsegvetes",
    title: "Költségvetés",
    href: "/app/koltsegvetes",
    sheetName: "Költségvetés",
    description:
      "Havi bevétel, kiadás, munkavállalói költség, profit és kintlévőség.",
    fields: [
      "Bevétel",
      "Összes kiadás",
      "Profit",
      "Nincs fizetve",
      "Munkák száma",
    ],
    calculations: [
      "Profit = bevétel - összes kiadás",
      "Összes kiadás = munkavállalói költség + működési költség + ügyfélköltség + beruházás",
      "Kintlévőség = minden nem fizetett bevétel összege",
      "Munkák / nap = munkák száma / tényleges munkanapok",
    ],
  },
  {
    key: "bevetelek",
    title: "Bevételek",
    href: "/app/bevetelek",
    sheetName: "Bevételek",
    description:
      "Általányos, havi elszámolásos és egyedi munkák bevételei.",
    fields: [
      "Ügyfél",
      "Cím",
      "Dátum",
      "Bevétel",
      "Fizetve",
      "Fizetés módja",
      "Számla",
    ],
    calculations: [
      "Hónap = dátum hónapja",
      "Havi bevétel = adott hónap bevételeinek összege",
      "Készpénz = kp fizetési módú bevételek összege",
      "Utalás = utalásos bevételek összege",
    ],
  },
  {
    key: "elszamolas-kalkulator",
    title: "Elszámolás kalkulátor",
    href: "/app/elszamolas-kalkulator",
    sheetName: "Elszám kalkulátor",
    description:
      "Napi munkaidő és munkadíj számítása megrendelőnként.",
    fields: [
      "Dátum",
      "Megrendelő",
      "Cím",
      "Feladat",
      "Fő",
      "Érkezés",
      "Távozás",
      "Idő",
    ],
    calculations: [
      "Idő = távozás - érkezés",
      "Csapatóra = fő x idő",
      "Munkadíj = csapatóra x 8000 Ft",
      "Tételsor = mennyiség x egységár",
    ],
  },
  {
    key: "elszamolas-reszletezo",
    title: "Elszámolás részletező",
    href: "/app/elszamolas-reszletezo",
    sheetName: "Elszám részletező",
    description:
      "Feladatok, anyagok és mennyiségek részletes elszámolása.",
    fields: [
      "Ügyfél",
      "Dátum",
      "Munkadíj",
      "Zöldhulladék",
      "Növényvédelem",
      "Gyomirtás",
    ],
    calculations: [
      "Oszlopösszesen = szűrt lista mennyiségeinek összege",
      "Munkadíj = fő és óra alapján átvett napi munkadíj",
      "Anyagösszesítő = anyagtípusonkénti mennyiség",
    ],
  },
  {
    key: "munkavallaloi-koltsegek",
    title: "Munkavállalói költségek",
    href: "/app/munkavallaloi-koltsegek",
    sheetName: "Munkavállalói_költségek",
    description:
      "Dolgozói napok, órák, túlórák, bónuszok és havi bérköltség.",
    fields: [
      "Napi bér",
      "Órabér",
      "Normál nap",
      "Normál óra",
      "Túlóra",
      "Bónusz",
      "Kiadás",
    ],
    calculations: [
      "Órabér = napi bér / 8",
      "Fizetés = napi bér x normál nap + órabér x normál óra",
      "Túlóra = túlóra száma x 5000 Ft",
      "Kiadás = fizetés + túlóra + egyéni összeg + bónusz",
    ],
  },
  {
    key: "kiadasok",
    title: "Kiadások",
    href: "/app/kiadasok",
    sheetName: "Kiadások",
    description:
      "Működési költségek, ügyfélköltségek, beruházások és áfa.",
    fields: [
      "Megnevezés",
      "Tétel",
      "Dátum",
      "Bruttó kiadás",
      "Áfa",
      "Típus",
      "Számlaszám",
    ],
    calculations: [
      "Hónap = dátum hónapja",
      "Áfa = bruttó kiadás - bruttó kiadás / 1,27",
      "Működési költség = MK típusú kiadások összege",
      "Ügyfélköltség = ÜF típusú kiadások összege",
    ],
  },
  {
    key: "fizetesek",
    title: "Fizetések",
    href: "/app/fizetesek",
    sheetName: "Fizetések",
    description:
      "Dolgozónkénti kifizetés, előleg, törlesztés és készpénz.",
    fields: [
      "Nap",
      "Óra",
      "Túlóra",
      "Bónusz",
      "Jövedelem",
      "Előleg",
      "Készpénz",
    ],
    calculations: [
      "Nap összege = napok száma x napi bér",
      "Óra összege = órák száma x órabér",
      "Jövedelem = nap + óra + túlóra + bónusz",
      "Készpénz = jövedelem - előleg - törlesztés",
    ],
  },
  {
    key: "teli-penzek",
    title: "Téli pénzek",
    href: "/app/teli-penzek",
    sheetName: "Téli pénzek",
    description:
      "Szezonális téli pénz, bónusz, tartozás és havi átlagok.",
    fields: [
      "Hónap",
      "Bónusz",
      "Jövedelem",
      "Téli pénz",
      "Tartozás",
      "Havi átlag",
    ],
    calculations: [
      "Jövedelem = téli pénz + bónusz jellegű sorok összege",
      "Kifizetendő = jövedelem - tartozás - levonás",
      "Összes téli pénz = dolgozói téli pénzek összege",
      "Összes kifizetendő = dolgozói kifizetendők összege",
    ],
  },
  {
    key: "ugyfelnyilvantartas",
    title: "Ügyfélnyilvántartás",
    href: "/app/ugyfelnyilvantartas",
    sheetName: "Ügyfélnyilvántartás",
    description:
      "Ügyfelek, címek, kapcsolattartók, általányok és aktív státusz.",
    fields: [
      "Név",
      "Cím",
      "Típus",
      "Kapcsolattartó",
      "Email",
      "Telefon",
      "Általány",
      "Aktív",
    ],
    calculations: [
      "Aktív ügyfelek = aktív státuszú ügyfelek száma",
      "Általányos ügyfelek = általány jelölésű ügyfelek száma",
      "Havi ügyfelek = minden hónapban jelölésű ügyfelek száma",
      "Ügyfélbevétel = ügyfélhez kapcsolt bevételi sorok összege",
    ],
  },
];

export function getBudgetModule(key: BudgetModuleKey) {
  return budgetModules.find((module) => module.key === key);
}
