import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber, toDateKey } from "@/lib/format";

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(d);
}

export type FinanceMetrics = {
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  profitMarginPercent: number | null;
};

export async function getFinanceMetrics(branchId?: string): Promise<FinanceMetrics> {
  const start = monthStart();

  const [expenseAgg, salesAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      _sum: { amountIls: true },
    }),
    prisma.salesEntry.aggregate({
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      _sum: { totalIls: true },
    }),
  ]);

  const totalExpenses = toNumber(expenseAgg._sum.amountIls);
  const totalRevenue = toNumber(salesAgg._sum.totalIls);
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalExpenses,
    totalRevenue,
    netProfit,
    profitMarginPercent: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : null,
  };
}

export async function getProfitByBranch(branchId?: string) {
  const start = monthStart();

  const [branches, salesRows, expenseRows] = await Promise.all([
    branchId
      ? prisma.branch.findMany({ where: { id: branchId }, select: { id: true, name: true } })
      : prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.salesEntry.groupBy({
      by: ["branchId"],
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      _sum: { totalIls: true },
    }),
    prisma.expense.groupBy({
      by: ["branchId"],
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      _sum: { amountIls: true },
    }),
  ]);

  const revenueByBranch = new Map(salesRows.map((r) => [r.branchId, toNumber(r._sum.totalIls)]));
  const expensesByBranch = new Map(expenseRows.map((r) => [r.branchId, toNumber(r._sum.amountIls)]));

  return branches.map((branch) => {
    const revenue = revenueByBranch.get(branch.id) ?? 0;
    const expenses = expensesByBranch.get(branch.id) ?? 0;
    return { branchId: branch.id, branchName: branch.name, revenue, expenses, net: revenue - expenses };
  });
}

export type MonthlyTrendPoint = {
  monthKey: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export async function getMonthlyTrend(branchId?: string, months = 6): Promise<MonthlyTrendPoint[]> {
  const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (months - 1), 1));

  const [salesRows, expenseRows] = await Promise.all([
    prisma.salesEntry.findMany({
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      select: { date: true, totalIls: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      select: { date: true, amountIls: true },
    }),
  ]);

  const revenueByMonth = new Map<string, number>();
  for (const row of salesRows) {
    const key = monthKey(row.date);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + toNumber(row.totalIls));
  }
  const expensesByMonth = new Map<string, number>();
  for (const row of expenseRows) {
    const key = monthKey(row.date);
    expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + toNumber(row.amountIls));
  }

  const result: MonthlyTrendPoint[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = monthKey(d);
    const revenue = revenueByMonth.get(key) ?? 0;
    const expenses = expensesByMonth.get(key) ?? 0;
    result.push({ monthKey: key, label: monthLabel(d), revenue, expenses, profit: revenue - expenses });
  }
  return result;
}

export type CategoryBreakdownPoint = { category: string; amountIls: number };

export async function getExpenseCategoryBreakdown(branchId?: string): Promise<CategoryBreakdownPoint[]> {
  const start = monthStart();
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
    _sum: { amountIls: true },
  });

  return rows
    .map((r) => ({ category: r.category as string, amountIls: toNumber(r._sum.amountIls) }))
    .sort((a, b) => b.amountIls - a.amountIls);
}

export async function getRecentExpenses(branchId?: string, limit = 10) {
  const expenses = await prisma.expense.findMany({
    where: branchId ? { branchId } : {},
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { branch: { select: { id: true, name: true } } },
  });

  return expenses.map((e) => ({
    id: e.id,
    date: e.date,
    branchId: e.branchId,
    branchName: e.branch.name,
    category: e.category as string,
    amountOriginal: toNumber(e.amountOriginal),
    currencyCode: e.currencyCode,
    amountIls: toNumber(e.amountIls),
    receiptUrl: e.receiptUrl,
  }));
}

export async function getExpenseForEdit(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return null;

  return {
    id: expense.id,
    branchId: expense.branchId,
    date: toDateKey(expense.date),
    category: expense.category,
    amountOriginal: toNumber(expense.amountOriginal),
    currencyCode: expense.currencyCode,
    notes: expense.notes ?? "",
    receiptUrl: expense.receiptUrl ?? "",
  };
}
