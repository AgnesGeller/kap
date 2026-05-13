export type MonthlyIncomeRow = {
  month: number;
  amount: number;
  status?: string | null;
  paymentMethod?: string | null;
  isVatInvoice?: boolean;
};

export type MonthlyExpenseRow = {
  month: number;
  grossAmount: number;
  type?: string | null;
  vatAmount?: number;
};

export type MonthlyPayrollRow = {
  month: number;
  totalAmount: number;
};

export type BudgetStatRow = {
  date: string | Date;
  amount?: number | null;
  grossAmount?: number | null;
  totalAmount?: number | null;
  status?: string | null;
  paymentMethod?: string | null;
  isVatInvoice?: boolean;
  type?: string | null;
};

export function getMonthFromDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.getMonth() + 1;
}

export function calculateWorkHours(startedAt: string, finishedAt: string) {
  const [startHour, startMinute] = startedAt.split(":").map(Number);
  const [finishHour, finishMinute] = finishedAt.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const finish = finishHour * 60 + finishMinute;
  const diff = Math.max(finish - start, 0);

  return Math.round((diff / 60) * 100) / 100;
}

export function calculateCrewHours(rows: Array<{ people: number; hours: number }>) {
  return rows.reduce((sum, row) => sum + row.people * row.hours, 0);
}

export function calculateLaborTotal(crewHours: number, hourlyRate = 8000) {
  return Math.round(crewHours * hourlyRate);
}

export function calculateLineTotal(quantity: number, unitPrice: number) {
  return Math.round(quantity * unitPrice);
}

export function calculateTieredAmount(
  quantity: number,
  oneUnitPrice: number,
  secondTierUnitPrice: number,
  thirdTierUnitPrice: number,
  thirdTierBase: number,
) {
  if (quantity <= 0) return 0;
  if (quantity === 1) return oneUnitPrice;
  if (quantity < 4) return secondTierUnitPrice * (quantity - 1) + oneUnitPrice;

  return thirdTierUnitPrice * (quantity - 4) + thirdTierBase;
}

export function calculateVatAmount(grossAmount: number, vatRate = 27) {
  const divisor = 1 + vatRate / 100;
  return Math.round(grossAmount - grossAmount / divisor);
}

export function calculatePayrollBase({
  dailyRate,
  normalDays,
  hourlyRate,
  normalHours,
}: {
  dailyRate: number;
  normalDays: number;
  hourlyRate: number;
  normalHours: number;
}) {
  return Math.round(dailyRate * normalDays + hourlyRate * normalHours);
}

export function calculatePayrollTotal({
  baseAmount,
  overtimeHours,
  overtimeRate = 5000,
  customAmount = 0,
  bonusAmount = 0,
}: {
  baseAmount: number;
  overtimeHours: number;
  overtimeRate?: number;
  customAmount?: number;
  bonusAmount?: number;
}) {
  return Math.round(baseAmount + overtimeHours * overtimeRate + customAmount + bonusAmount);
}

export function calculateNetPayment({
  grossPayment,
  advance = 0,
  loanRepayment = 0,
}: {
  grossPayment: number;
  advance?: number;
  loanRepayment?: number;
}) {
  return Math.round(grossPayment - advance - loanRepayment);
}

export function calculateMonthlySummary({
  month,
  incomes,
  expenses,
  payroll,
}: {
  month: number;
  incomes: MonthlyIncomeRow[];
  expenses: MonthlyExpenseRow[];
  payroll: MonthlyPayrollRow[];
}) {
  const monthIncomes = incomes.filter((row) => row.month === month);
  const monthExpenses = expenses.filter((row) => row.month === month);
  const monthPayroll = payroll.filter((row) => row.month === month);

  const revenue = monthIncomes.reduce((sum, row) => sum + row.amount, 0);
  const unpaid = monthIncomes
    .filter((row) => row.status !== "paid")
    .reduce((sum, row) => sum + row.amount, 0);
  const cash = monthIncomes
    .filter((row) => row.paymentMethod === "cash")
    .reduce((sum, row) => sum + row.amount, 0);
  const transfer = monthIncomes
    .filter((row) => row.paymentMethod === "transfer")
    .reduce((sum, row) => sum + row.amount, 0);
  const vatIncome = monthIncomes
    .filter((row) => row.isVatInvoice)
    .reduce((sum, row) => sum + row.amount, 0);
  const clientExpenses = monthExpenses
    .filter((row) => row.type === "client")
    .reduce((sum, row) => sum + row.grossAmount, 0);
  const operatingExpenses = monthExpenses
    .filter((row) => row.type === "operating")
    .reduce((sum, row) => sum + row.grossAmount, 0);
  const investments = monthExpenses
    .filter((row) => row.type === "investment")
    .reduce((sum, row) => sum + row.grossAmount, 0);
  const payrollCost = monthPayroll.reduce((sum, row) => sum + row.totalAmount, 0);
  const totalExpenses = payrollCost + clientExpenses + operatingExpenses + investments;

  return {
    revenue,
    unpaid,
    cash,
    transfer,
    vatIncome,
    clientExpenses,
    operatingExpenses,
    investments,
    payrollCost,
    totalExpenses,
    profit: revenue - totalExpenses,
  };
}

export function getDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function getYearFromDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.getFullYear();
}

export function calculateDailySummary({
  day,
  incomes,
  expenses,
  payroll,
}: {
  day: string;
  incomes: BudgetStatRow[];
  expenses: BudgetStatRow[];
  payroll: BudgetStatRow[];
}) {
  const dayIncomes = incomes.filter((row) => getDayKey(row.date) === day);
  const dayExpenses = expenses.filter((row) => getDayKey(row.date) === day);
  const dayPayroll = payroll.filter((row) => getDayKey(row.date) === day);
  const revenue = dayIncomes.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const expenseTotal = dayExpenses.reduce(
    (sum, row) => sum + Number(row.grossAmount ?? 0),
    0,
  );
  const payrollTotal = dayPayroll.reduce(
    (sum, row) => sum + Number(row.totalAmount ?? 0),
    0,
  );

  return {
    revenue,
    expenseTotal,
    payrollTotal,
    totalExpenses: expenseTotal + payrollTotal,
    profit: revenue - expenseTotal - payrollTotal,
    workCount: dayIncomes.length,
  };
}

export function calculateYearlySummary({
  year,
  incomes,
  expenses,
  payroll,
}: {
  year: number;
  incomes: BudgetStatRow[];
  expenses: BudgetStatRow[];
  payroll: BudgetStatRow[];
}) {
  const yearlyIncomes = incomes.filter((row) => getYearFromDate(row.date) === year);
  const yearlyExpenses = expenses.filter((row) => getYearFromDate(row.date) === year);
  const yearlyPayroll = payroll.filter((row) => getYearFromDate(row.date) === year);
  const revenue = yearlyIncomes.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const expenseTotal = yearlyExpenses.reduce(
    (sum, row) => sum + Number(row.grossAmount ?? 0),
    0,
  );
  const payrollTotal = yearlyPayroll.reduce(
    (sum, row) => sum + Number(row.totalAmount ?? 0),
    0,
  );
  const unpaid = yearlyIncomes
    .filter((row) => row.status !== "paid")
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  return {
    revenue,
    expenseTotal,
    payrollTotal,
    totalExpenses: expenseTotal + payrollTotal,
    profit: revenue - expenseTotal - payrollTotal,
    unpaid,
    workCount: yearlyIncomes.length,
  };
}

export function calculateWorkPerDay({
  workCount,
  workdays,
  saturdayWorkdays = 0,
  rainyDays = 0,
}: {
  workCount: number;
  workdays: number;
  saturdayWorkdays?: number;
  rainyDays?: number;
}) {
  const activeDays = workdays + saturdayWorkdays - rainyDays;
  if (activeDays <= 0) return 0;

  return Math.round((workCount / activeDays) * 100) / 100;
}
