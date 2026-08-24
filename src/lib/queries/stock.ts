import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Locations a user may see. OWNER sees everything; a branch-scoped user sees
 * their own branch location plus all warehouses (they order stock from them).
 */
function visibleLocationWhere(scopedBranchId?: string) {
  if (!scopedBranchId) return { isActive: true };
  return {
    isActive: true,
    OR: [{ branchId: scopedBranchId }, { type: "WAREHOUSE" as const }],
  };
}

/** The reorder point actually in force: per-location minimum, else the item default. */
function effectiveThreshold(minimumQuantity: unknown, itemThreshold: unknown): number {
  const min = toNumber(minimumQuantity);
  return min > 0 ? min : toNumber(itemThreshold);
}

export type StockLocationRow = {
  id: string;
  name: string;
  nameAr: string | null;
  type: string;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
};

export async function getStockLocations(scopedBranchId?: string): Promise<StockLocationRow[]> {
  const locations = await prisma.stockLocation.findMany({
    where: visibleLocationWhere(scopedBranchId),
    include: { branch: { select: { name: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    nameAr: l.nameAr,
    type: l.type as string,
    branchId: l.branchId,
    branchName: l.branch?.name ?? null,
    isActive: l.isActive,
  }));
}

/** All locations including inactive — for the OWNER-only management page. */
export async function getStockLocationsManaged(): Promise<StockLocationRow[]> {
  const locations = await prisma.stockLocation.findMany({
    include: { branch: { select: { name: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    nameAr: l.nameAr,
    type: l.type as string,
    branchId: l.branchId,
    branchName: l.branch?.name ?? null,
    isActive: l.isActive,
  }));
}

/**
 * Locations whose stock the user may edit (minimums, movements).
 * Mirrors the guard in the stock actions — the action stays the enforcement
 * point; this exists so the UI can hide controls it knows will be rejected.
 */
export async function getEditableLocationIds(
  role: string,
  scopedBranchId?: string
): Promise<string[]> {
  const where =
    role === "OWNER" ? { isActive: true } : scopedBranchId ? { isActive: true, branchId: scopedBranchId } : null;
  if (!where) return [];

  const rows = await prisma.stockLocation.findMany({ where, select: { id: true } });
  return rows.map((l) => l.id);
}

export async function getWarehouses() {
  const rows = await prisma.stockLocation.findMany({
    where: { type: "WAREHOUSE", isActive: true },
    select: { id: true, name: true, nameAr: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

/** Resolves the location filter for a page: an explicit pick, else the user's whole visible set. */
async function resolveLocationIds(scopedBranchId?: string, locationId?: string): Promise<string[]> {
  const visible = await prisma.stockLocation.findMany({
    where: visibleLocationWhere(scopedBranchId),
    select: { id: true },
  });
  const ids = visible.map((l) => l.id);
  if (locationId && ids.includes(locationId)) return [locationId];
  return ids;
}

export async function getLowStockAlerts(scopedBranchId?: string, locationId?: string) {
  const locationIds = await resolveLocationIds(scopedBranchId, locationId);

  const rows = await prisma.locationStock.findMany({
    where: { locationId: { in: locationIds } },
    include: {
      location: { select: { id: true, name: true, nameAr: true, type: true } },
      stockItem: {
        select: { id: true, name: true, nameAr: true, unit: true, lowStockThreshold: true, isActive: true },
      },
    },
  });

  return rows
    .filter((r) => {
      if (!r.stockItem.isActive) return false;
      return toNumber(r.currentQuantity) < effectiveThreshold(r.minimumQuantity, r.stockItem.lowStockThreshold);
    })
    .map((r) => ({
      locationId: r.location.id,
      locationName: r.location.name,
      locationNameAr: r.location.nameAr,
      locationType: r.location.type as string,
      stockItemId: r.stockItem.id,
      itemName: r.stockItem.name,
      itemNameAr: r.stockItem.nameAr,
      unit: r.stockItem.unit as string,
      currentQuantity: toNumber(r.currentQuantity),
      threshold: effectiveThreshold(r.minimumQuantity, r.stockItem.lowStockThreshold),
    }))
    .sort((a, b) => a.currentQuantity - a.threshold - (b.currentQuantity - b.threshold));
}

export async function getStockLevelsGrid(scopedBranchId?: string, locationId?: string) {
  const locationIds = await resolveLocationIds(scopedBranchId, locationId);

  const [items, locations, stockRows] = await Promise.all([
    prisma.stockItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.stockLocation.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, nameAr: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.locationStock.findMany({ where: { locationId: { in: locationIds } } }),
  ]);

  const quantities: Record<string, Record<string, number>> = {};
  const minimums: Record<string, Record<string, number>> = {};
  for (const row of stockRows) {
    (quantities[row.locationId] ??= {})[row.stockItemId] = toNumber(row.currentQuantity);
    (minimums[row.locationId] ??= {})[row.stockItemId] = toNumber(row.minimumQuantity);
  }

  return {
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      nameAr: i.nameAr,
      unit: i.unit as string,
      threshold: toNumber(i.lowStockThreshold),
    })),
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      nameAr: l.nameAr,
      type: l.type as string,
    })),
    quantities,
    minimums,
  };
}

export async function getRecentMovements(scopedBranchId?: string, locationId?: string, limit = 15) {
  const locationIds = await resolveLocationIds(scopedBranchId, locationId);

  const movements = await prisma.stockMovement.findMany({
    where: { locationId: { in: locationIds } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      location: { select: { name: true, nameAr: true } },
      stockItem: { select: { name: true, nameAr: true, unit: true } },
      supplier: { select: { name: true } },
    },
  });

  return movements.map((m) => ({
    id: m.id,
    date: m.date,
    locationName: m.location.name,
    locationNameAr: m.location.nameAr,
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

export async function getStockMetrics(scopedBranchId?: string, locationId?: string) {
  const start = monthStart();
  const locationIds = await resolveLocationIds(scopedBranchId, locationId);

  const [purchaseAgg, wasteCount] = await Promise.all([
    prisma.stockMovement.aggregate({
      where: { type: "PURCHASE", date: { gte: start }, locationId: { in: locationIds } },
      _sum: { costIls: true },
    }),
    prisma.stockMovement.count({
      where: { type: "WASTE", date: { gte: start }, locationId: { in: locationIds } },
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

export type StockRequestRow = {
  id: string;
  requestingLocationId: string;
  requestingLocationName: string;
  requestingLocationNameAr: string | null;
  fulfillingLocationId: string;
  fulfillingLocationName: string;
  fulfillingLocationNameAr: string | null;
  status: string;
  requestedByName: string;
  reviewedByName: string | null;
  notes: string | null;
  createdAt: Date;
  items: {
    id: string;
    stockItemId: string;
    itemName: string;
    itemNameAr: string | null;
    unit: string;
    quantityRequested: number;
    quantityFulfilled: number | null;
  }[];
};

function mapRequest(r: {
  id: string;
  requestingLocationId: string;
  requestingLocation: { name: string; nameAr: string | null };
  fulfillingLocationId: string;
  fulfillingLocation: { name: string; nameAr: string | null };
  status: string;
  requestedBy: { name: string };
  reviewedBy: { name: string } | null;
  notes: string | null;
  createdAt: Date;
  items: {
    id: string;
    stockItemId: string;
    stockItem: { name: string; nameAr: string | null; unit: string };
    quantityRequested: unknown;
    quantityFulfilled: unknown;
  }[];
}): StockRequestRow {
  return {
    id: r.id,
    requestingLocationId: r.requestingLocationId,
    requestingLocationName: r.requestingLocation.name,
    requestingLocationNameAr: r.requestingLocation.nameAr,
    fulfillingLocationId: r.fulfillingLocationId,
    fulfillingLocationName: r.fulfillingLocation.name,
    fulfillingLocationNameAr: r.fulfillingLocation.nameAr,
    status: r.status,
    requestedByName: r.requestedBy.name,
    reviewedByName: r.reviewedBy?.name ?? null,
    notes: r.notes,
    createdAt: r.createdAt,
    items: r.items.map((i) => ({
      id: i.id,
      stockItemId: i.stockItemId,
      itemName: i.stockItem.name,
      itemNameAr: i.stockItem.nameAr,
      unit: i.stockItem.unit as string,
      quantityRequested: toNumber(i.quantityRequested),
      quantityFulfilled: i.quantityFulfilled != null ? toNumber(i.quantityFulfilled) : null,
    })),
  };
}

const REQUEST_INCLUDE = {
  requestingLocation: { select: { name: true, nameAr: true } },
  fulfillingLocation: { select: { name: true, nameAr: true } },
  requestedBy: { select: { name: true } },
  reviewedBy: { select: { name: true } },
  items: { include: { stockItem: { select: { name: true, nameAr: true, unit: true } } } },
} as const;

export async function getStockRequests(scopedBranchId?: string): Promise<StockRequestRow[]> {
  const locationIds = await resolveLocationIds(scopedBranchId);

  const requests = await prisma.stockRequest.findMany({
    where: {
      OR: [
        { requestingLocationId: { in: locationIds } },
        { fulfillingLocationId: { in: locationIds } },
      ],
    },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return requests.map(mapRequest);
}

/** Locations whose incoming requests this user may approve/reject/fulfil. */
export async function getApproverLocationIds(
  role: string,
  scopedBranchId?: string
): Promise<string[]> {
  if (role === "OWNER") {
    const all = await prisma.stockLocation.findMany({ select: { id: true } });
    return all.map((l) => l.id);
  }
  if (role !== "MANAGER" || !scopedBranchId) return [];
  // A branch manager approves requests aimed at their own branch's location.
  const own = await prisma.stockLocation.findMany({
    where: { branchId: scopedBranchId },
    select: { id: true },
  });
  return own.map((l) => l.id);
}

export async function getPendingRequestCount(role: string, scopedBranchId?: string): Promise<number> {
  const approverIds = await getApproverLocationIds(role, scopedBranchId);
  if (approverIds.length === 0) return 0;

  return prisma.stockRequest.count({
    where: { status: "PENDING", fulfillingLocationId: { in: approverIds } },
  });
}
