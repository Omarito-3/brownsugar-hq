import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getLowStockAlerts(branchId?: string) {
  const rows = await prisma.branchStock.findMany({
    where: branchId ? { branchId } : {},
    include: {
      branch: { select: { id: true, name: true } },
      stockItem: {
        select: { id: true, name: true, nameAr: true, unit: true, lowStockThreshold: true, isActive: true },
      },
    },
  });

  return rows
    .filter(
      (r) => r.stockItem.isActive && toNumber(r.currentQuantity) < toNumber(r.stockItem.lowStockThreshold)
    )
    .map((r) => ({
      branchId: r.branch.id,
      branchName: r.branch.name,
      stockItemId: r.stockItem.id,
      itemName: r.stockItem.name,
      itemNameAr: r.stockItem.nameAr,
      unit: r.stockItem.unit as string,
      currentQuantity: toNumber(r.currentQuantity),
      threshold: toNumber(r.stockItem.lowStockThreshold),
    }))
    .sort(
      (a, b) => a.currentQuantity - a.threshold - (b.currentQuantity - b.threshold)
    );
}

export async function getStockLevelsGrid(branchId?: string) {
  const [items, branches, stockRows] = await Promise.all([
    prisma.stockItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    branchId
      ? prisma.branch.findMany({ where: { id: branchId }, select: { id: true, name: true } })
      : prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    prisma.branchStock.findMany({ where: branchId ? { branchId } : {} }),
  ]);

  const quantities: Record<string, Record<string, number>> = {};
  for (const row of stockRows) {
    (quantities[row.branchId] ??= {})[row.stockItemId] = toNumber(row.currentQuantity);
  }

  return {
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      nameAr: i.nameAr,
      unit: i.unit as string,
      threshold: toNumber(i.lowStockThreshold),
    })),
    branches,
    quantities,
  };
}

export async function getRecentMovements(branchId?: string, limit = 15) {
  const movements = await prisma.stockMovement.findMany({
    where: branchId ? { branchId } : {},
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      branch: { select: { name: true } },
      stockItem: { select: { name: true, nameAr: true, unit: true } },
      supplier: { select: { name: true } },
    },
  });

  return movements.map((m) => ({
    id: m.id,
    date: m.date,
    branchName: m.branch.name,
    itemName: m.stockItem.name,
    itemNameAr: m.stockItem.nameAr,
    unit: m.stockItem.unit as string,
    type: m.type as string,
    direction: m.direction as string | null,
    quantity: toNumber(m.quantity),
    costIls: m.costIls != null ? toNumber(m.costIls) : null,
    supplierName: m.supplier?.name ?? null,
  }));
}

export async function getStockMetrics(branchId?: string) {
  const start = monthStart();

  const [purchaseAgg, wasteCount] = await Promise.all([
    prisma.stockMovement.aggregate({
      where: { type: "PURCHASE", date: { gte: start }, ...(branchId ? { branchId } : {}) },
      _sum: { costIls: true },
    }),
    prisma.stockMovement.count({
      where: { type: "WASTE", date: { gte: start }, ...(branchId ? { branchId } : {}) },
    }),
  ]);

  return {
    purchaseSpendThisMonth: toNumber(purchaseAgg._sum.costIls),
    wasteCountThisMonth: wasteCount,
  };
}

export async function getStockItemsForForm() {
  const items = await prisma.stockItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return items.map((i) => ({ id: i.id, name: i.name, nameAr: i.nameAr, unit: i.unit as string }));
}

export async function getStockItemsManaged() {
  const items = await prisma.stockItem.findMany({ orderBy: { name: "asc" } });
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    nameAr: i.nameAr ?? "",
    unit: i.unit,
    lowStockThreshold: toNumber(i.lowStockThreshold),
    isActive: i.isActive,
  }));
}

export async function getSuppliersForForm() {
  const suppliers = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return suppliers.map((s) => ({ id: s.id, name: s.name }));
}

export async function getSuppliersManaged() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone ?? "",
    notes: s.notes ?? "",
    isActive: s.isActive,
  }));
}
