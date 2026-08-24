"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { movementSchema, type MovementInput } from "@/lib/validations/stock";
import { applyMovementTx, InsufficientStockError } from "@/lib/stock-movements";

export type StockActionResult =
  | { ok: true; expenseCreated?: number }
  | { ok: false; error: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Locations a user may record movements against. */
async function writableLocationIds(role: string, branchId?: string | null): Promise<string[]> {
  if (role === "OWNER") {
    const all = await prisma.stockLocation.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return all.map((l) => l.id);
  }
  if (!branchId) return [];
  const own = await prisma.stockLocation.findMany({
    where: { isActive: true, branchId },
    select: { id: true },
  });
  return own.map((l) => l.id);
}

export async function recordMovement(input: MovementInput): Promise<StockActionResult> {
  const [session, t, tv, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("stock"),
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
  const allowed = await writableLocationIds(role, userBranchId);

  try {
    if (data.type === "TRANSFER") {
      if (role !== "OWNER") {
        return { ok: false, error: t("ownerOnlyTransfer") };
      }

      const fromLocationId = data.fromLocationId!;
      const toLocationId = data.toLocationId!;

      await prisma.$transaction(async (tx) => {
        await applyMovementTx(tx, {
          locationId: fromLocationId,
          stockItemId: data.stockItemId,
          type: "TRANSFER_OUT",
          quantity: data.quantity,
          date,
          enteredById: userId,
          notes: data.notes,
        });
        await applyMovementTx(tx, {
          locationId: toLocationId,
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

    const locationId = data.locationId!;
    if (!allowed.includes(locationId)) {
      return { ok: false, error: t("noLocationAccess") };
    }

    // Narrowed to a local const: property narrowing on `data.type` doesn't
    // survive into the transaction closure below, but a local const does.
    const movementType = data.type as Exclude<typeof data.type, "TRANSFER">;

    // A PURCHASE only posts a Finance expense when the stock lands at a branch —
    // warehouse purchases have no single branch to attribute the cost to.
    const location = await prisma.stockLocation.findUnique({
      where: { id: locationId },
      select: { branchId: true },
    });

    let expenseCreated: number | undefined;

    await prisma.$transaction(async (tx) => {
      let expenseId: string | null = null;

      if (
        movementType === "PURCHASE" &&
        data.costIls &&
        data.costIls > 0 &&
        location?.branchId
      ) {
        const item = await tx.stockItem.findUnique({
          where: { id: data.stockItemId },
          select: { name: true },
        });
        const expense = await tx.expense.create({
          data: {
            branchId: location.branchId,
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
        locationId,
        stockItemId: data.stockItemId,
        type: movementType,
        direction: movementType === "ADJUSTMENT" ? data.direction || null : null,
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

export async function setLocationMinimum(
  locationId: string,
  stockItemId: string,
  minimumQuantity: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const allowed = await writableLocationIds(session.user.role, session.user.branchId);
  if (!allowed.includes(locationId)) return { ok: false, error: t("noLocationAccess") };
  if (!Number.isFinite(minimumQuantity) || minimumQuantity < 0) {
    return { ok: false, error: tc("invalidInput") };
  }

  await prisma.locationStock.upsert({
    where: { locationId_stockItemId: { locationId, stockItemId } },
    update: { minimumQuantity },
    create: { locationId, stockItemId, currentQuantity: 0, minimumQuantity },
  });

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  return { ok: true };
}
