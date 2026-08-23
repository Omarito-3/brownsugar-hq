"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { stockItemSchema, type StockItemInput } from "@/lib/validations/stock-items";

export type StockItemActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

async function requireManager() {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
    return { ok: false as const, error: t("managerRequiredItems") };
  }
  return { ok: true as const };
}

export async function createStockItem(input: StockItemInput): Promise<StockItemActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const [tv, tc] = await Promise.all([
    getTranslations("stock"),
    getTranslations("common"),
  ]);
  const parsed = stockItemSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const item = await prisma.stockItem.create({
    data: {
      name: parsed.data.name,
      nameAr: parsed.data.nameAr || null,
      unit: parsed.data.unit,
      lowStockThreshold: parsed.data.lowStockThreshold,
    },
  });

  revalidatePath("/stock/items");
  revalidatePath("/stock");
  return { ok: true, id: item.id };
}

export async function updateStockItem(
  id: string,
  input: StockItemInput
): Promise<StockItemActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const [tv, tc] = await Promise.all([
    getTranslations("stock"),
    getTranslations("common"),
  ]);
  const parsed = stockItemSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  await prisma.stockItem.update({
    where: { id },
    data: {
      name: parsed.data.name,
      nameAr: parsed.data.nameAr || null,
      lowStockThreshold: parsed.data.lowStockThreshold,
    },
  });

  revalidatePath("/stock/items");
  revalidatePath("/stock");
  return { ok: true, id };
}

export async function setStockItemActive(id: string, isActive: boolean): Promise<SimpleActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  await prisma.stockItem.update({ where: { id }, data: { isActive } });

  revalidatePath("/stock/items");
  revalidatePath("/stock");
  return { ok: true };
}

export async function deleteStockItem(id: string): Promise<SimpleActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);

  try {
    await prisma.stockItem.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { ok: false, error: t("itemHasHistory") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }

  revalidatePath("/stock/items");
  revalidatePath("/stock");
  return { ok: true };
}
