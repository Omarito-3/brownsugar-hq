"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { supplierSchema, type SupplierInput } from "@/lib/validations/stock-items";

export type SupplierActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

async function requireManager() {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
    return { ok: false as const, error: t("managerRequiredSuppliers") };
  }
  return { ok: true as const };
}

export async function createSupplier(input: SupplierInput): Promise<SupplierActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const [tv, tc] = await Promise.all([
    getTranslations("stock.validation"),
    getTranslations("common"),
  ]);
  const parsed = supplierSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/stock/suppliers");
  return { ok: true, id: supplier.id };
}

export async function updateSupplier(
  id: string,
  input: SupplierInput
): Promise<SupplierActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const [tv, tc] = await Promise.all([
    getTranslations("stock.validation"),
    getTranslations("common"),
  ]);
  const parsed = supplierSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  await prisma.supplier.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/stock/suppliers");
  return { ok: true, id };
}

export async function setSupplierActive(id: string, isActive: boolean): Promise<SimpleActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  await prisma.supplier.update({ where: { id }, data: { isActive } });

  revalidatePath("/stock/suppliers");
  return { ok: true };
}

export async function deleteSupplier(id: string): Promise<SimpleActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);

  try {
    await prisma.supplier.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { ok: false, error: t("supplierHasHistory") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }

  revalidatePath("/stock/suppliers");
  return { ok: true };
}
