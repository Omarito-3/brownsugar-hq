"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { stockItemSchema, type StockItemInput } from "@/lib/validations/stock-items";

export type StockItemActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

async function requireManager() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not authenticated." };
  if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
    return { ok: false as const, error: "Only owners and managers can manage stock items." };
  }
  return { ok: true as const };
}

export async function createStockItem(input: StockItemInput): Promise<StockItemActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const parsed = stockItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
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

  const parsed = stockItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
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

  try {
    await prisma.stockItem.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return {
        ok: false,
        error: "This item has stock or movement history — deactivate it instead of deleting.",
      };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  revalidatePath("/stock/items");
  revalidatePath("/stock");
  return { ok: true };
}
