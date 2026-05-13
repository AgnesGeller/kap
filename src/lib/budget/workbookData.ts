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

export const budgetWorkbook = workbookData as WorkbookData;

export function getWorkbookSheet(sheetName: string) {
  return budgetWorkbook.sheets[sheetName] ?? null;
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
