import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber, toDateKey, formatShortDate } from "@/lib/format";

function isoWeekStart(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function weekRange(weeksAgo: number) {
  const thisWeekStart = isoWeekStart(new Date());
  const start = new Date(thisWeekStart);
  start.setUTCDate(start.getUTCDate() - weeksAgo * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function todayUtcStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type WeeklyMetrics = {
  totalRevenue: number;
  totalOrders: number;
  avgPerOrder: number;
  wowChangePercent: number | null;
};

export async function getWeeklyMetrics(branchId?: string): Promise<WeeklyMetrics> {
  const { start: thisStart, end: thisEnd } = weekRange(0);
  const { start: prevStart, end: prevEnd } = weekRange(1);

  const [thisWeek, prevWeek] = await Promise.all([
    prisma.salesEntry.aggregate({
      where: { date: { gte: thisStart, lt: thisEnd }, ...(branchId ? { branchId } : {}) },
      _sum: { totalIls: true, orderCount: true },
    }),
    prisma.salesEntry.aggregate({
      where: { date: { gte: prevStart, lt: prevEnd }, ...(branchId ? { branchId } : {}) },
      _sum: { totalIls: true },
    }),
  ]);

  const totalRevenue = toNumber(thisWeek._sum.totalIls);
  const totalOrders = toNumber(thisWeek._sum.orderCount);
  const prevRevenue = toNumber(prevWeek._sum.totalIls);

  return {
    totalRevenue,
    totalOrders,
    avgPerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    wowChangePercent: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null,
  };
}

export type DailyRevenuePoint = { dateKey: string; label: string } & Record<string, number | string>;

export async function getDailyRevenueSeries(branchId?: string, days = 30) {
  const start = todayUtcStart();
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const [rows, branches] = await Promise.all([
    prisma.salesEntry.groupBy({
      by: ["branchId", "date"],
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      _sum: { totalIls: true },
    }),
    branchId
      ? prisma.branch.findMany({ where: { id: branchId }, select: { id: true, name: true } })
      : prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const byDateAndBranch = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const key = toDateKey(row.date);
    if (!byDateAndBranch.has(key)) byDateAndBranch.set(key, new Map());
    byDateAndBranch.get(key)!.set(row.branchId, toNumber(row._sum.totalIls));
  }

  const series: DailyRevenuePoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = toDateKey(d);
    const point: DailyRevenuePoint = { dateKey: key, label: formatShortDate(d) };
    const dayValues = byDateAndBranch.get(key);
    for (const branch of branches) {
      point[branch.id] = dayValues?.get(branch.id) ?? 0;
    }
    series.push(point);
  }

  return { series, branches };
}

export async function getRevenueByBranchThisMonth(branchId?: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [rows, branches] = await Promise.all([
    prisma.salesEntry.groupBy({
      by: ["branchId"],
      where: { date: { gte: monthStart }, ...(branchId ? { branchId } : {}) },
      _sum: { totalIls: true },
    }),
    branchId
      ? prisma.branch.findMany({ where: { id: branchId }, select: { id: true, name: true } })
      : prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const revenueByBranch = new Map(rows.map((r) => [r.branchId, toNumber(r._sum.totalIls)]));

  return branches.map((branch) => ({
    branchId: branch.id,
    branchName: branch.name,
    revenue: revenueByBranch.get(branch.id) ?? 0,
  }));
}

export async function getRecentSalesEntries(branchId?: string, limit = 10) {
  const entries = await prisma.salesEntry.findMany({
    where: branchId ? { branchId } : {},
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { branch: { select: { id: true, name: true } } },
  });

  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    totalIls: toNumber(e.totalIls),
    orderCount: e.orderCount,
    branchId: e.branchId,
    branchName: e.branch.name,
  }));
}

export async function getTodayPerBranch(branchId?: string) {
  const today = todayUtcStart();

  const [branches, entries] = await Promise.all([
    branchId
      ? prisma.branch.findMany({ where: { id: branchId }, select: { id: true, name: true } })
      : prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.salesEntry.findMany({
      where: { date: today, ...(branchId ? { branchId } : {}) },
      select: { branchId: true, totalIls: true, orderCount: true },
    }),
  ]);

  const byBranch = new Map(entries.map((e) => [e.branchId, e]));

  return branches.map((branch) => {
    const entry = byBranch.get(branch.id);
    return {
      branchId: branch.id,
      branchName: branch.name,
      hasEntry: !!entry,
      totalIls: entry ? toNumber(entry.totalIls) : 0,
      orderCount: entry?.orderCount ?? 0,
    };
  });
}

export async function getBranchesForUser(scopedBranchId?: string) {
  return prisma.branch.findMany({
    where: scopedBranchId ? { id: scopedBranchId } : { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getBranchProductsMap() {
  const rows = await prisma.branchProduct.findMany({
    where: { isAvailable: true, product: { isActive: true } },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const map: Record<string, { id: string; name: string }[]> = {};
  for (const row of rows) {
    (map[row.branchId] ??= []).push(row.product);
  }
  return map;
}

export async function getSalesEntryForEdit(id: string) {
  const entry = await prisma.salesEntry.findUnique({
    where: { id },
    include: {
      lineItems: { select: { productId: true, quantity: true } },
      currencyAmounts: { select: { currencyCode: true, amountOriginal: true } },
    },
  });
  if (!entry) return null;

  return {
    id: entry.id,
    branchId: entry.branchId,
    date: toDateKey(entry.date),
    totalIls: toNumber(entry.totalIls),
    orderCount: entry.orderCount,
    notes: entry.notes ?? "",
    lineItems: entry.lineItems,
    currencyAmounts: entry.currencyAmounts.map((c) => ({
      currencyCode: c.currencyCode,
      amountOriginal: toNumber(c.amountOriginal),
    })),
  };
}

export async function getCurrencies() {
  const currencies = await prisma.currency.findMany({ orderBy: { code: "asc" } });
  return currencies.map((c) => ({ code: c.code, rateToIls: toNumber(c.rateToIls) }));
}

export async function findEntryByBranchAndDate(branchId: string, dateKey: string) {
  return prisma.salesEntry.findUnique({
    where: { branchId_date: { branchId, date: new Date(`${dateKey}T00:00:00.000Z`) } },
    select: { id: true },
  });
}
