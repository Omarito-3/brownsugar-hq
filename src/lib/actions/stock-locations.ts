"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { stockLocationSchema, type StockLocationInput } from "@/lib/validations/stock";

export type LocationActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

async function requireOwner() {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER") return { ok: false as const, error: t("ownerOnlyLocations") };
  return { ok: true as const, session };
}

/** Warehouses only — BRANCH locations are created by the branch migration/seed, not by hand. */
export async function createWarehouse(input: StockLocationInput): Promise<LocationActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const [tv, tc] = await Promise.all([getTranslations("stock"), getTranslations("common")]);
  const parsed = stockLocationSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const location = await prisma.stockLocation.create({
    data: {
      name: parsed.data.name,
      nameAr: parsed.data.nameAr || null,
      type: "WAREHOUSE",
      branchId: null,
    },
  });

  revalidatePath("/stock/locations");
  revalidatePath("/stock");
  return { ok: true, id: location.id };
}

export async function updateStockLocation(
  id: string,
  input: StockLocationInput
): Promise<LocationActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const [tv, tc] = await Promise.all([getTranslations("stock"), getTranslations("common")]);
  const parsed = stockLocationSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const existing = await prisma.stockLocation.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    const t = await getTranslations("stock.actions");
    return { ok: false, error: t("locationNotFound") };
  }

  await prisma.stockLocation.update({
    where: { id },
    data: { name: parsed.data.name, nameAr: parsed.data.nameAr || null },
  });

  revalidatePath("/stock/locations");
  revalidatePath("/stock");
  return { ok: true, id };
}

export async function setStockLocationActive(
  id: string,
  isActive: boolean
): Promise<SimpleActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const existing = await prisma.stockLocation.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    const t = await getTranslations("stock.actions");
    return { ok: false, error: t("locationNotFound") };
  }

  await prisma.stockLocation.update({ where: { id }, data: { isActive } });

  revalidatePath("/stock/locations");
  revalidatePath("/stock");
  return { ok: true };
}

export async function deleteStockLocation(id: string): Promise<SimpleActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);

  const existing = await prisma.stockLocation.findUnique({
    where: { id },
    select: { id: true, type: true },
  });
  if (!existing) return { ok: false, error: t("locationNotFound") };
  // A branch's location is structural — removing it would orphan the branch's stock.
  if (existing.type === "BRANCH") return { ok: false, error: t("cannotDeleteBranchLocation") };

  try {
    await prisma.stockLocation.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { ok: false, error: t("locationHasHistory") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }

  revalidatePath("/stock/locations");
  revalidatePath("/stock");
  return { ok: true };
}
