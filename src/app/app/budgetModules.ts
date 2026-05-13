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
    title: "K\u00f6lts\u00e9gvet\u00e9s",
    href: "/app/koltsegvetes",
    sheetName: "K\u00f6lts\u00e9gvet\u00e9s",
    description:
      "Havi bev\u00e9tel, kiad\u00e1s, munkav\u00e1llal\u00f3i k\u00f6lts\u00e9g, profit \u00e9s kintl\u00e9v\u0151s\u00e9g.",
    fields: [
      "Bev\u00e9tel",
      "\u00d6sszes kiad\u00e1s",
      "Profit",
      "Nincs fizetve",
      "Munk\u00e1k sz\u00e1ma",
    ],
    calculations: [
      "Profit = bev\u00e9tel - \u00f6sszes kiad\u00e1s",
      "\u00d6sszes kiad\u00e1s = munkav\u00e1llal\u00f3i k\u00f6lts\u00e9g + m\u0171k\u00f6d\u00e9si k\u00f6lts\u00e9g + \u00fcgyf\u00e9lk\u00f6lts\u00e9g + beruh\u00e1z\u00e1s",
      "Kintl\u00e9v\u0151s\u00e9g = minden nem fizetett bev\u00e9tel \u00f6sszege",
      "Munk\u00e1k / nap = munk\u00e1k sz\u00e1ma / t\u00e9nyleges munkanapok",
    ],
  },
  {
    key: "bevetelek",
    title: "Bev\u00e9telek",
    href: "/app/bevetelek",
    sheetName: "Bev\u00e9telek",
    description:
      "\u00c1ltal\u00e1nyos, havi elsz\u00e1mol\u00e1sos \u00e9s egyedi munk\u00e1k bev\u00e9telei.",
    fields: [
      "\u00dcgyf\u00e9l",
      "C\u00edm",
      "D\u00e1tum",
      "Bev\u00e9tel",
      "Fizetve",
      "Fizet\u00e9s m\u00f3dja",
      "Sz\u00e1mla",
    ],
    calculations: [
      "H\u00f3nap = d\u00e1tum h\u00f3napja",
      "Havi bev\u00e9tel = adott h\u00f3nap bev\u00e9teleinek \u00f6sszege",
      "K\u00e9szp\u00e9nz = kp fizet\u00e9si m\u00f3d\u00fa bev\u00e9telek \u00f6sszege",
      "Utal\u00e1s = utal\u00e1sos bev\u00e9telek \u00f6sszege",
    ],
  },
  {
    key: "elszamolas-kalkulator",
    title: "Elsz\u00e1mol\u00e1s kalkul\u00e1tor",
    href: "/app/elszamolas-kalkulator",
    sheetName: "Elsz\u00e1m kalkul\u00e1tor",
    description:
      "Napi munkaid\u0151 \u00e9s munkad\u00edj sz\u00e1m\u00edt\u00e1sa megrendel\u0151nk\u00e9nt.",
    fields: [
      "D\u00e1tum",
      "Megrendel\u0151",
      "C\u00edm",
      "Feladat",
      "F\u0151",
      "\u00c9rkez\u00e9s",
      "T\u00e1voz\u00e1s",
      "Id\u0151",
    ],
    calculations: [
      "Id\u0151 = t\u00e1voz\u00e1s - \u00e9rkez\u00e9s",
      "Csapat\u00f3ra = f\u0151 x id\u0151",
      "Munkad\u00edj = csapat\u00f3ra x 8000 Ft",
      "T\u00e9telsor = mennyis\u00e9g x egys\u00e9g\u00e1r",
    ],
  },
  {
    key: "elszamolas-reszletezo",
    title: "Elsz\u00e1mol\u00e1s r\u00e9szletez\u0151",
    href: "/app/elszamolas-reszletezo",
    sheetName: "Elsz\u00e1m r\u00e9szletez\u0151",
    description:
      "Feladatok, anyagok \u00e9s mennyis\u00e9gek r\u00e9szletes elsz\u00e1mol\u00e1sa.",
    fields: [
      "\u00dcgyf\u00e9l",
      "D\u00e1tum",
      "Munkad\u00edj",
      "Z\u00f6ldhullad\u00e9k",
      "N\u00f6v\u00e9nyv\u00e9delem",
      "Gyomirt\u00e1s",
    ],
    calculations: [
      "Oszlop\u00f6sszesen = sz\u0171rt lista mennyis\u00e9geinek \u00f6sszege",
      "Munkad\u00edj = f\u0151 \u00e9s \u00f3ra alapj\u00e1n \u00e1tvett napi munkad\u00edj",
      "Anyag\u00f6sszes\u00edt\u0151 = anyagt\u00edpusonk\u00e9nti mennyis\u00e9g",
    ],
  },
  {
    key: "munkavallaloi-koltsegek",
    title: "Munkav\u00e1llal\u00f3i k\u00f6lts\u00e9gek",
    href: "/app/munkavallaloi-koltsegek",
    sheetName: "Munkav\u00e1llal\u00f3i_k\u00f6lts\u00e9gek",
    description:
      "Dolgoz\u00f3i napok, \u00f3r\u00e1k, t\u00fal\u00f3r\u00e1k, b\u00f3nuszok \u00e9s havi b\u00e9rk\u00f6lts\u00e9g.",
    fields: [
      "Napi b\u00e9r",
      "\u00d3rab\u00e9r",
      "Norm\u00e1l nap",
      "Norm\u00e1l \u00f3ra",
      "T\u00fal\u00f3ra",
      "B\u00f3nusz",
      "Kiad\u00e1s",
    ],
    calculations: [
      "\u00d3rab\u00e9r = napi b\u00e9r / 8",
      "Fizet\u00e9s = napi b\u00e9r x norm\u00e1l nap + \u00f3rab\u00e9r x norm\u00e1l \u00f3ra",
      "T\u00fal\u00f3ra = t\u00fal\u00f3ra sz\u00e1ma x 5000 Ft",
      "Kiad\u00e1s = fizet\u00e9s + t\u00fal\u00f3ra + egy\u00e9ni \u00f6sszeg + b\u00f3nusz",
    ],
  },
  {
    key: "kiadasok",
    title: "Kiad\u00e1sok",
    href: "/app/kiadasok",
    sheetName: "Kiad\u00e1sok",
    description:
      "M\u0171k\u00f6d\u00e9si k\u00f6lts\u00e9gek, \u00fcgyf\u00e9lk\u00f6lts\u00e9gek, beruh\u00e1z\u00e1sok \u00e9s \u00e1fa.",
    fields: [
      "Megnevez\u00e9s",
      "T\u00e9tel",
      "D\u00e1tum",
      "Brutt\u00f3 kiad\u00e1s",
      "\u00c1fa",
      "T\u00edpus",
      "Sz\u00e1mlasz\u00e1m",
    ],
    calculations: [
      "H\u00f3nap = d\u00e1tum h\u00f3napja",
      "\u00c1fa = brutt\u00f3 kiad\u00e1s - brutt\u00f3 kiad\u00e1s / 1,27",
      "M\u0171k\u00f6d\u00e9si k\u00f6lts\u00e9g = MK t\u00edpus\u00fa kiad\u00e1sok \u00f6sszege",
      "\u00dcgyf\u00e9lk\u00f6lts\u00e9g = \u00dcF t\u00edpus\u00fa kiad\u00e1sok \u00f6sszege",
    ],
  },
  {
    key: "fizetesek",
    title: "Fizet\u00e9sek",
    href: "/app/fizetesek",
    sheetName: "Fizet\u00e9sek",
    description:
      "Dolgoz\u00f3nk\u00e9nti kifizet\u00e9s, el\u0151leg, t\u00f6rleszt\u00e9s \u00e9s k\u00e9szp\u00e9nz.",
    fields: [
      "Nap",
      "\u00d3ra",
      "T\u00fal\u00f3ra",
      "B\u00f3nusz",
      "J\u00f6vedelem",
      "El\u0151leg",
      "K\u00e9szp\u00e9nz",
    ],
    calculations: [
      "Nap \u00f6sszege = napok sz\u00e1ma x napi b\u00e9r",
      "\u00d3ra \u00f6sszege = \u00f3r\u00e1k sz\u00e1ma x \u00f3rab\u00e9r",
      "J\u00f6vedelem = nap + \u00f3ra + t\u00fal\u00f3ra + b\u00f3nusz",
      "K\u00e9szp\u00e9nz = j\u00f6vedelem - el\u0151leg - t\u00f6rleszt\u00e9s",
    ],
  },
  {
    key: "teli-penzek",
    title: "T\u00e9li p\u00e9nzek",
    href: "/app/teli-penzek",
    sheetName: "T\u00e9li p\u00e9nzek",
    description:
      "Szezon\u00e1lis t\u00e9li p\u00e9nz, b\u00f3nusz, tartoz\u00e1s \u00e9s havi \u00e1tlagok.",
    fields: [
      "H\u00f3nap",
      "B\u00f3nusz",
      "J\u00f6vedelem",
      "T\u00e9li p\u00e9nz",
      "Tartoz\u00e1s",
      "Havi \u00e1tlag",
    ],
    calculations: [
      "J\u00f6vedelem = t\u00e9li p\u00e9nz + b\u00f3nusz jelleg\u0171 sorok \u00f6sszege",
      "Kifizetend\u0151 = j\u00f6vedelem - tartoz\u00e1s - levon\u00e1s",
      "\u00d6sszes t\u00e9li p\u00e9nz = dolgoz\u00f3i t\u00e9li p\u00e9nzek \u00f6sszege",
      "\u00d6sszes kifizetend\u0151 = dolgoz\u00f3i kifizetend\u0151k \u00f6sszege",
    ],
  },
  {
    key: "ugyfelnyilvantartas",
    title: "\u00dcgyf\u00e9lnyilv\u00e1ntart\u00e1s",
    href: "/app/ugyfelnyilvantartas",
    sheetName: "\u00dcgyf\u00e9lnyilv\u00e1ntart\u00e1s",
    description:
      "\u00dcgyfelek, c\u00edmek, kapcsolattart\u00f3k, \u00e1ltal\u00e1nyok \u00e9s akt\u00edv st\u00e1tusz.",
    fields: [
      "N\u00e9v",
      "C\u00edm",
      "T\u00edpus",
      "Kapcsolattart\u00f3",
      "Email",
      "Telefon",
      "\u00c1ltal\u00e1ny",
      "Akt\u00edv",
    ],
    calculations: [
      "Akt\u00edv \u00fcgyfelek = akt\u00edv st\u00e1tusz\u00fa \u00fcgyfelek sz\u00e1ma",
      "\u00c1ltal\u00e1nyos \u00fcgyfelek = \u00e1ltal\u00e1ny jel\u00f6l\u00e9s\u0171 \u00fcgyfelek sz\u00e1ma",
      "Havi \u00fcgyfelek = minden h\u00f3napban jel\u00f6l\u00e9s\u0171 \u00fcgyfelek sz\u00e1ma",
      "\u00dcgyf\u00e9lbev\u00e9tel = \u00fcgyf\u00e9lhez kapcsolt bev\u00e9teli sorok \u00f6sszege",
    ],
  },
];

export function getBudgetModule(key: BudgetModuleKey) {
  return budgetModules.find((module) => module.key === key);
}
