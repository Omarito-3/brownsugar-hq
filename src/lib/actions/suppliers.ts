"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { supplierSchema, type SupplierInput } from "@/lib/validations/stock-items";

export type SupplierActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

async function requireManager() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Not authenticated." };
  if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
    return { ok: false as const, error: "Only owners and managers can manage suppliers." };
  }
  return { ok: true as const };
}

export async function createSupplier(input: SupplierInput): Promise<SupplierActionResult> {
  const access = await requireManager();
  if (!access.ok) return access;

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
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

  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
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

  try {
    await prisma.supplier.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return {
        ok: false,
        error: "This supplier has purchase history — deactivate it instead of deleting.",
      };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  revalidatePath("/stock/suppliers");
  return { ok: true };
}
