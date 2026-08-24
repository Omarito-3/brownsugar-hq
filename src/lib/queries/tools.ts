import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

export type CalculatorProduct = {
  id: string;
  name: string;
  nameAr: string | null;
  basePriceIls: number;
  costIls: number | null;
};

export async function getProductsForCalculator(): Promise<CalculatorProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    nameAr: p.nameAr,
    basePriceIls: toNumber(p.basePriceIls),
    costIls: p.costIls != null ? toNumber(p.costIls) : null,
  }));
}

export type BreakEvenSnapshot = {
  fixedCostsIls: number;
  actualOrders: number;
  actualRevenueIls: number;
  daysElapsed: number;
  daysInMonth: number;
};

/**
 * Fixed costs and actual trading for one branch-month.
 *
 * "Fixed" here means RENT + SALARY — the costs that don't scale with each order.
 * SUPPLIES and the rest are variable and belong in the per-unit cost instead.
 */
export async function getBreakEvenSnapshot(
  branchId: string,
  monthKey: string
): Promise<BreakEvenSnapshot> {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const [fixedAgg, salesAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        branchId,
        date: { gte: start, lt: end },
        category: { in: ["RENT", "SALARY"] },
      },
      _sum: { amountIls: true },
    }),
    prisma.salesEntry.aggregate({
      where: { branchId, date: { gte: start, lt: end } },
      _sum: { totalIls: true, orderCount: true },
      _count: { _all: true },
    }),
  ]);

  // Days elapsed only counts the part of the month that has actually happened,
  // so a mid-month check compares like with like.
  const now = new Date();
  const isCurrentMonth =
    now.getUTCFullYear() === year && now.getUTCMonth() === month - 1;
  const daysElapsed = isCurrentMonth ? now.getUTCDate() : daysInMonth;

  return {
    fixedCostsIls: toNumber(fixedAgg._sum.amountIls),
    actualOrders: salesAgg._sum.orderCount ?? 0,
    actualRevenueIls: toNumber(salesAgg._sum.totalIls),
    daysElapsed: Math.max(1, daysElapsed),
    daysInMonth,
  };
}
