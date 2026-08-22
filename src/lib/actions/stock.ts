"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import { movementSchema, type MovementInput } from "@/lib/validations/stock";

export type StockActionResult =
  | { ok: true; expenseCreated?: number }
  | { ok: false; error: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

class InsufficientStockError extends Error {}

// ADJUSTMENT's sign depends on its `direction` field instead of a fixed type,
// so it's intentionally not listed here — see the isAdd logic below.
const ADDING_TYPES = new Set(["PURCHASE", "TRANSFER_IN"]);

type DbMovementType =
  | "PURCHASE"
  | "CONSUMPTION"
  | "WASTE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT";

type AdjustmentDirection = "INCREASE" | "DECREASE";

/**
 * Upserts the BranchStock row, applies the signed delta for this movement
 * type, rejects if the result would go negative, and writes the
 * StockMovement row — all within the caller's transaction.
 */
async function applyMovementTx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma's interactive-transaction client type isn't cleanly extractable from the generated client's overloaded $transaction signature.
  tx: any,
  params: {
    branchId: string;
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

  const branchStock = await tx.branchStock.upsert({
    where: { branchId_stockItemId: { branchId: params.branchId, stockItemId: params.stockItemId } },
    update: {},
    create: { branchId: params.branchId, stockItemId: params.stockItemId, currentQuantity: 0 },
  });

  const current = toNumber(branchStock.currentQuantity);
  const next = isAdd ? current + params.quantity : current - params.quantity;
  if (next < 0) {
    throw new InsufficientStockError(
      "Not enough stock for this movement — it would bring the quantity below zero."
    );
  }

  await tx.branchStock.update({ where: { id: branchStock.id }, data: { currentQuantity: next } });

  await tx.stockMovement.create({
    data: {
      branchId: params.branchId,
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

export async function recordMovement(input: MovementInput): Promise<StockActionResult> {
  const [session, t, tv, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("stock.validation"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const parsed = movementSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const data = parsed.data;
  const { role, branchId: userBranchId, id: userId } = session.user;
  const date = toDate(data.date);

  try {
    if (data.type === "TRANSFER") {
      if (role !== "OWNER") {
        return { ok: false, error: t("ownerOnlyTransfer") };
      }

      const fromBranchId = data.fromBranchId!;
      const toBranchId = data.toBranchId!;

      await prisma.$transaction(async (tx) => {
        await applyMovementTx(tx, {
          branchId: fromBranchId,
          stockItemId: data.stockItemId,
          type: "TRANSFER_OUT",
          quantity: data.quantity,
          date,
          enteredById: userId,
          notes: data.notes,
        });
        await applyMovementTx(tx, {
          branchId: toBranchId,
          stockItemId: data.stockItemId,
          type: "TRANSFER_IN",
          quantity: data.quantity,
          date,
          enteredById: userId,
          notes: data.notes,
        });
      });

      revalidatePath("/stock");
      revalidatePath("/dashboard");
      return { ok: true };
    }

    const branchId = role === "OWNER" ? data.branchId! : userBranchId;
    if (!branchId) return { ok: false, error: t("noBranchAssigned") };

    // Narrowed to a local const: property narrowing on `data.type` doesn't
    // survive into the transaction closure below, but a local const does.
    const movementType = data.type as Exclude<typeof data.type, "TRANSFER">;

    let expenseCreated: number | undefined;

    await prisma.$transaction(async (tx) => {
      let expenseId: string | null = null;

      if (movementType === "PURCHASE" && data.costIls && data.costIls > 0) {
        const item = await tx.stockItem.findUnique({
          where: { id: data.stockItemId },
          select: { name: true },
        });
        const expense = await tx.expense.create({
          data: {
            branchId,
            date,
            category: "SUPPLIES",
            amountOriginal: data.costIls,
            currencyCode: "ILS",
            amountIls: data.costIls,
            notes: `Stock purchase: ${data.quantity} × ${item?.name ?? "item"}`,
            enteredById: userId,
          },
        });
        expenseId = expense.id;
        expenseCreated = data.costIls;
      }

      await applyMovementTx(tx, {
        branchId,
        stockItemId: data.stockItemId,
        type: movementType,
        direction: movementType === "ADJUSTMENT" ? (data.direction || null) : null,
        quantity: data.quantity,
        date,
        enteredById: userId,
        costIls: movementType === "PURCHASE" ? (data.costIls ?? null) : null,
        supplierId: movementType === "PURCHASE" ? data.supplierId || null : null,
        expenseId,
        notes: data.notes,
      });
    });

    revalidatePath("/stock");
    revalidatePath("/dashboard");
    if (expenseCreated) revalidatePath("/finance");

    return { ok: true, expenseCreated };
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { ok: false, error: t("insufficientStock") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }
}
