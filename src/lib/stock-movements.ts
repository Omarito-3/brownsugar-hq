import "server-only";

import { toNumber } from "@/lib/format";

/**
 * Shared stock-movement primitives.
 *
 * These deliberately live outside any `"use server"` module: a server-action file
 * may only export async functions, so a class, a type, or a plain helper exported
 * from one silently invalidates every export in that module.
 */

export class InsufficientStockError extends Error {}

// ADJUSTMENT's sign depends on its `direction` field instead of a fixed type,
// so it's intentionally not listed here — see the isAdd logic below.
const ADDING_TYPES = new Set(["PURCHASE", "TRANSFER_IN"]);

export type DbMovementType =
  | "PURCHASE"
  | "CONSUMPTION"
  | "WASTE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT";

export type AdjustmentDirection = "INCREASE" | "DECREASE";

/**
 * Upserts the LocationStock row, applies the signed delta for this movement
 * type, rejects if the result would go negative, and writes the
 * StockMovement row — all within the caller's transaction.
 */
export async function applyMovementTx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's interactive-transaction client type isn't cleanly extractable from the generated client's overloaded $transaction signature.
  tx: any,
  params: {
    locationId: string;
    stockItemId: string;
    type: DbMovementType;
    direction?: AdjustmentDirection | null;
    quantity: number;
    date: Date;
    enteredById: string;
    costIls?: number | null;
    supplierId?: string | null;
    expenseId?: string | null;
    notes?: string | null;
  }
) {
  const isAdd =
    params.type === "ADJUSTMENT" ? params.direction === "INCREASE" : ADDING_TYPES.has(params.type);

  const locationStock = await tx.locationStock.upsert({
    where: {
      locationId_stockItemId: { locationId: params.locationId, stockItemId: params.stockItemId },
    },
    update: {},
    create: { locationId: params.locationId, stockItemId: params.stockItemId, currentQuantity: 0 },
  });

  const current = toNumber(locationStock.currentQuantity);
  const next = isAdd ? current + params.quantity : current - params.quantity;
  if (next < 0) {
    throw new InsufficientStockError("insufficient-stock");
  }

  await tx.locationStock.update({ where: { id: locationStock.id }, data: { currentQuantity: next } });

  await tx.stockMovement.create({
    data: {
      locationId: params.locationId,
      stockItemId: params.stockItemId,
      type: params.type,
      direction: params.type === "ADJUSTMENT" ? params.direction : null,
      quantity: params.quantity,
      costIls: params.costIls ?? null,
      supplierId: params.supplierId ?? null,
      expenseId: params.expenseId ?? null,
      notes: params.notes || null,
      date: params.date,
      enteredById: params.enteredById,
    },
  });
}
