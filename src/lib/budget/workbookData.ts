import workbookData from "@/data/budgetWorkbookData.json";

type WorkbookTable = {
  name: string;
  range: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
};

type WorkbookSheet = {
  title: string;
  rowCount: number;
  columnCount: number;
  tables: WorkbookTable[];
  rows: Array<{
    row: number;
    values: unknown[];
  }>;
  formulas: Array<{
    cell: string;
    formula: string;
  }>;
};

type WorkbookData = {
  sourceFile: string;
  generatedAt: string;
  sheets: Record<string, WorkbookSheet>;
};

export type WorkbookCustomerOption = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  source?: string;
};

export type WorkbookExpenseEntry = {
  id: string;
  vendorName: string;
  itemName: string;
  expenseDate: string;
  grossAmount: number;
  vatRate: number;
  vatAmount: number;
  expenseType: "client" | "operating" | "investment" | "other";
  paymentMethod: "cash" | "transfer" | "card" | "other" | null;
  invoiceNumber: string;
  notes: string;
  isReconciled: boolean;
  source?: string;
};

export type WorkbookIncomeEntry = {
  id: string;
  customerName: string;
  siteAddress: string;
  description: string;
  incomeDate: string;
  calculatedAmount: number;
  amount: number;
  status: "draft" | "unpaid" | "partial" | "paid" | "cancelled";
  paymentMethod: "cash" | "transfer" | "card" | "other" | null;
  invoiceNumber: string;
  notes: string;
  isVatInvoice: boolean;
  source?: string;
};

export type WorkbookPayrollEntry = {
  id: string;
  employeeName: string;
  payrollDate: string;
  normalDays: number;
  normalHours: number;
  overtimeHours: number;
  dailyRate: number;
  hourlyRate: number;
  overtimeRate: number;
  bonusAmount: number;
  customAmount: number;
  totalAmount: number;
  notes: string;
  source?: string;
};

export type WorkbookPriceItemOption = {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  vatRate: number;
  notes: string;
  source?: string;
};

export const budgetWorkbook = workbookData as WorkbookData;

const mojibakePairs: Array<[string, string]> = [
  ["Ă", "Á"],
  ["Ă‰", "É"],
  ["Ă", "Í"],
  ["Ă“", "Ó"],
  ["Ă–", "Ö"],
  ["Ĺ", "Ő"],
  ["Ăš", "Ú"],
  ["Ăś", "Ü"],
  ["Ĺ°", "Ű"],
  ["Ăˇ", "á"],
  ["Ă©", "é"],
  ["Ă­", "í"],
  ["Ăł", "ó"],
  ["Ă¶", "ö"],
  ["Ĺ‘", "ő"],
  ["Ăş", "ú"],
  ["ĂĽ", "ü"],
  ["Ĺ±", "ű"],
  ["Â·", "·"],
  ["Â", ""],
];

export function cleanWorkbookText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return mojibakePairs.reduce(
    (text, [broken, fixed]) => text.split(broken).join(fixed),
    value,
  ).trim();
}

function normalizeWorkbookKey(value: string) {
  return cleanWorkbookText(value)
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getWorkbookSheet(sheetName: string) {
  return (
    budgetWorkbook.sheets[sheetName] ??
    Object.entries(budgetWorkbook.sheets).find(
      ([name]) => normalizeWorkbookKey(name) === normalizeWorkbookKey(sheetName),
    )?.[1] ??
    null
  );
}

export function getSheetDataSummary(sheetName: string) {
  const sheet = getWorkbookSheet(sheetName);
  if (!sheet) {
    return {
      rowCount: 0,
      columnCount: 0,
      tableCount: 0,
      tableRowCount: 0,
      formulaCount: 0,
    };
  }

  return {
    rowCount: sheet.rowCount,
    columnCount: sheet.columnCount,
    tableCount: sheet.tables.length,
    tableRowCount: sheet.tables.reduce((sum, table) => sum + table.rows.length, 0),
    formulaCount: sheet.formulas.length,
  };
}

const settlementBaseColumns = new Set([
  "ugyfel",
  "cim",
  "datum",
  "munkadij(fo)",
  "munkadij(ora)",
]);

export function getSettlementDetailItemHeaders() {
  const sheet = getWorkbookSheet("Elszám részletező");
  const headerRow = sheet?.rows.find((row) => row.row === 1);

  if (!headerRow) {
    return [];
  }

  return headerRow.values
    .map(cleanWorkbookText)
    .filter(Boolean)
    .filter((value) => !settlementBaseColumns.has(normalizeWorkbookKey(value)));
}

export function getSettlementDetailUnitOptions() {
  const extractedUnits = getSettlementDetailItemHeaders()
    .map((header) => {
      const match = header.match(/\(([^)]+)\)/);
      return match?.[1]?.trim() ?? "";
    })
    .filter(Boolean);

  return Array.from(
    new Set([
      "db",
      "óra",
      "m2",
      "m3",
      "zsák",
      "20L zsák",
      "50L zsák",
      "1m3/fuvar",
      "2m3/fuvar",
      "3m3/fuvar",
      "ömlesztett",
      "zsákos",
      "tonna",
      "liter",
      "fuvar",
      "kg",
      "fm",
      ...extractedUnits,
    ]),
  );
}

function parseHeaderItem(value: string) {
  const cleaned = cleanWorkbookText(value);
  const match = cleaned.match(/^(.*?)\s*\(([^)]+)\)\s*$/);

  return {
    name: match?.[1]?.trim() || cleaned,
    unit: match?.[2]?.trim() || "db",
  };
}

export function getWorkbookPriceItems() {
  const items = new Map<string, WorkbookPriceItemOption>();
  const calculatorSheet = getWorkbookSheet("Elszám kalkulátor");
  const calculatorTable = calculatorSheet?.tables.find((table) =>
    table.headers.some((header) => normalizeWorkbookKey(header) === "megnevezes"),
  );

  calculatorTable?.rows.forEach((row, index) => {
    const name = getTextValue(row, ["megnevezés", "Megnevezés"]);
    const unitPrice = getNumberValue(row, ["Ár", "Ar"]);
    const unit = getTextValue(row, ["Egység", "Egyseg"]) || "db";
    const notes = getTextValue(row, ["Megjegyzés", "Megjegyzes"]);

    if (!name) return;

    const key = `${normalizeWorkbookKey(name)}__${normalizeWorkbookKey(unit)}`;
    items.set(key, {
      id: `excel-price-calculator-${index + 1}`,
      name,
      category: "Elszámolás",
      unit,
      unitPrice,
      vatRate: 27,
      notes,
      source: cleanWorkbookText(calculatorSheet.title),
    });
  });

  getSettlementDetailItemHeaders().forEach((header, index) => {
    const parsed = parseHeaderItem(header);
    const key = `${normalizeWorkbookKey(parsed.name)}__${normalizeWorkbookKey(parsed.unit)}`;

    if (items.has(key)) return;

    items.set(key, {
      id: `excel-price-detail-${index + 1}`,
      name: parsed.name,
      category: "Munkalap tétel",
      unit: parsed.unit,
      unitPrice: 0,
      vatRate: 27,
      notes: "",
      source: "Elszám részletező",
    });
  });

  return Array.from(items.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "hu-HU"),
  );
}

function getTextValue(row: Record<string, unknown>, keys: string[]) {
  const value = getRawValue(row, keys);
  const text = cleanWorkbookText(value);

  return text;
}

function getRawValue(row: Record<string, unknown>, keys: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => ({
    key: normalizeWorkbookKey(key),
    value,
  }));

  for (const key of keys) {
    const normalizedKey = normalizeWorkbookKey(key);
    const match = normalizedEntries.find((entry) => entry.key === normalizedKey);

    if (match?.value !== undefined && match.value !== null && match.value !== "") {
      return match.value;
    }
  }

  return "";
}

function getNumberValue(row: Record<string, unknown>, keys: string[]) {
  const value = getRawValue(row, keys);

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateValue(row: Record<string, unknown>, keys: string[]) {
  const value = getRawValue(row, keys);

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function mapExpenseType(value: string): WorkbookExpenseEntry["expenseType"] {
  const normalized = normalizeWorkbookKey(value);

  if (normalized === "uf" || normalized.includes("ugyfel")) {
    return "client";
  }

  if (normalized === "mk" || normalized.includes("mukodes")) {
    return "operating";
  }

  if (normalized.includes("beruhazas")) {
    return "investment";
  }

  return "other";
}

function mapIncomeStatus(value: string, amount: number, calculatedAmount: number): WorkbookIncomeEntry["status"] {
  const normalized = normalizeWorkbookKey(value);

  if (["ok", "igen", "fizetve", "paid"].includes(normalized)) {
    return "paid";
  }

  if (amount > 0 && calculatedAmount > amount) {
    return "partial";
  }

  if (amount > 0) {
    return "paid";
  }

  return "unpaid";
}

function mapPaymentMethod(value: string): WorkbookIncomeEntry["paymentMethod"] {
  const normalized = normalizeWorkbookKey(value);

  if (normalized.includes("kp") || normalized.includes("keszpenz")) {
    return "cash";
  }

  if (normalized.includes("utalas") || normalized.includes("otp")) {
    return "transfer";
  }

  if (normalized.includes("kartya")) {
    return "card";
  }

  if (normalized) {
    return "other";
  }

  return null;
}

function hasClientLikeData(row: Record<string, unknown>, sheetName: string) {
  return Boolean(
    getTextValue(row, ["Cím", "Projekt cím", "Számlázási cím"]) ||
      getTextValue(row, ["Telefonszám", "Telefon", "Email cím", "Email", "E-mail"]) ||
      normalizeWorkbookKey(sheetName).includes("ugyfel") ||
      normalizeWorkbookKey(sheetName).includes("bevetel") ||
      normalizeWorkbookKey(sheetName).includes("elszam"),
  );
}

export function getWorkbookCustomerOptions() {
  const customers = new Map<string, WorkbookCustomerOption>();

  for (const [sheetName, sheet] of Object.entries(budgetWorkbook.sheets)) {
    for (const table of sheet.tables) {
      table.rows.forEach((row, rowIndex) => {
        const name = getTextValue(row, ["Név", "Ügyfél", "Megnevezés"]);

        if (!name || name.length < 2 || !hasClientLikeData(row, sheetName)) {
          return;
        }

        const normalizedName = normalizeWorkbookKey(name);
        const existing = customers.get(normalizedName);
        const customer: WorkbookCustomerOption = {
          id: existing?.id ?? `excel-${customers.size + 1}-${rowIndex + 1}`,
          name: existing?.name || name,
          address:
            existing?.address ||
            getTextValue(row, ["Cím", "Projekt cím", "Számlázási cím"]),
          phone: existing?.phone || getTextValue(row, ["Telefonszám", "Telefon"]),
          email: existing?.email || getTextValue(row, ["Email cím", "Email", "E-mail"]),
          notes:
            existing?.notes ||
            getTextValue(row, ["Megjegyzés", "Gyakori munka", "Megj."]),
          source: existing?.source ?? cleanWorkbookText(sheetName),
        };

        customers.set(normalizedName, customer);
      });
    }
  }

  return Array.from(customers.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "hu-HU"),
  );
}

export function getWorkbookExpenseEntries() {
  const sheet = getWorkbookSheet("Kiadások");

  if (!sheet) {
    return [];
  }

  return sheet.tables.flatMap((table) =>
    table.rows
      .map((row, index): WorkbookExpenseEntry | null => {
        const vendorName = getTextValue(row, ["Megnevezés"]);
        const itemName = getTextValue(row, ["Tétel"]);
        const expenseDate = getDateValue(row, ["Dátum"]);
        const grossAmount = getNumberValue(row, ["Bruttó Kiadás", "Bruttó kiadás"]);
        const rawVatRate = getNumberValue(row, [
          "Áfa tartalom (bruttó * 0,2126)",
          "Áfa tartalom",
        ]);
        const vatRate = rawVatRate > 0 && rawVatRate <= 1 ? rawVatRate * 100 : rawVatRate || 27;
        const vatAmount =
          getNumberValue(row, ["Áfa"]) || grossAmount - grossAmount / (1 + vatRate / 100);
        const typeText = getTextValue(row, ["Típus"]);
        const invoiceNumber = getTextValue(row, ["Számlaszám"]);
        const notes = getTextValue(row, ["Megjegyzés"]);
        const paymentMethod = mapPaymentMethod(
          getTextValue(row, ["Fizetés  módja", "Fizetés módja", "Fizetve"]) || notes,
        );
        const reconciledText = normalizeWorkbookKey(getTextValue(row, ["Egyeztetve"]));

        if (!vendorName || !itemName || !expenseDate || !grossAmount) {
          return null;
        }

        return {
          id: `excel-expense-${index + 1}`,
          vendorName,
          itemName,
          expenseDate,
          grossAmount,
          vatRate,
          vatAmount,
          expenseType: mapExpenseType(typeText),
          paymentMethod,
          invoiceNumber,
          notes,
          isReconciled: ["ok", "igen", "egyeztetve"].includes(reconciledText),
          source: cleanWorkbookText(sheet.title),
        };
      })
      .filter((row): row is WorkbookExpenseEntry => Boolean(row)),
  );
}

export function getWorkbookIncomeEntries() {
  const sheet = getWorkbookSheet("Bevételek");

  if (!sheet) {
    return [];
  }

  const incomeTables = sheet.tables.filter((table) =>
    table.headers.some((header) => normalizeWorkbookKey(header) === "ugyfel"),
  );

  return incomeTables.flatMap((table) =>
    table.rows
      .map((row, index): WorkbookIncomeEntry | null => {
        const customerName = getTextValue(row, ["Ügyfél"]);
        const siteAddress = getTextValue(row, ["Cím"]);
        const description = getTextValue(row, ["Megjegyzés"]);
        const incomeDate = getDateValue(row, ["Dátum"]);
        const calculatedAmount = getNumberValue(row, ["Kalkulált"]);
        const amount = getNumberValue(row, ["Bevétel"]);
        const invoiceNumber = getTextValue(row, ["Számla"]);
        const notes = getTextValue(row, ["Megj."]);
        const paymentMethodText = getTextValue(row, ["Fizetés  módja", "Fizetés módja"]);
        const statusText = getTextValue(row, ["Fizetve"]);
        const totalExpected = calculatedAmount || amount;

        if (!customerName || !incomeDate || !totalExpected) {
          return null;
        }

        const joinedText = `${description} ${invoiceNumber} ${notes}`;

        return {
          id: `excel-income-${index + 1}`,
          customerName,
          siteAddress,
          description,
          incomeDate,
          calculatedAmount: totalExpected,
          amount,
          status: mapIncomeStatus(statusText, amount, totalExpected),
          paymentMethod: mapPaymentMethod(paymentMethodText),
          invoiceNumber,
          notes,
          isVatInvoice: normalizeWorkbookKey(joinedText).includes("afa"),
          source: cleanWorkbookText(sheet.title),
        };
      })
      .filter((row): row is WorkbookIncomeEntry => Boolean(row)),
  );
}

function normalizeEmployeeName(value: string) {
  return cleanWorkbookText(value)
    .replace(/\s+bér$/i, "")
    .replace(/\s+ber$/i, "")
    .trim();
}

export function getWorkbookPayrollEntries() {
  const sheet = getWorkbookSheet("Munkavállalói_költségek");

  if (!sheet) {
    return [];
  }

  const payrollTable = sheet.tables.find((table) =>
    table.headers.some((header) => normalizeWorkbookKey(header) === "napi ber"),
  );

  if (!payrollTable) {
    return [];
  }

  return payrollTable.rows
    .map((row, index): WorkbookPayrollEntry | null => {
      const employeeName = normalizeEmployeeName(getTextValue(row, ["Megnevezés"]));
      const payrollDate = getDateValue(row, ["Dátum"]);
      const dailyRate = getNumberValue(row, ["Napi bér"]);
      const hourlyRate = getNumberValue(row, ["Órabér"]);
      const normalDays = getNumberValue(row, ["Normál nap"]);
      const normalHours = getNumberValue(row, ["Normál óra"]);
      const overtimeHours = getNumberValue(row, ["Túlóra száma"]);
      const customAmount = getNumberValue(row, ["Egyéni összeg"]);
      const wageAmount = getNumberValue(row, ["Fizetés / összeg"]);
      const overtimeAmount = getNumberValue(row, ["Túlóra"]);
      const bonusAmount = getNumberValue(row, ["Bónusz"]);
      const totalAmount = getNumberValue(row, ["Kiadás"]) || wageAmount + overtimeAmount + bonusAmount + customAmount;
      const notes = getTextValue(row, ["Megjegyzés"]);

      if (!employeeName || !payrollDate || !totalAmount) {
        return null;
      }

      return {
        id: `excel-payroll-${index + 1}`,
        employeeName,
        payrollDate,
        normalDays,
        normalHours,
        overtimeHours,
        dailyRate,
        hourlyRate,
        overtimeRate: overtimeHours ? overtimeAmount / overtimeHours : 5000,
        bonusAmount,
        customAmount,
        totalAmount,
        notes,
        source: cleanWorkbookText(sheet.title),
      };
    })
    .filter((row): row is WorkbookPayrollEntry => Boolean(row));
}
