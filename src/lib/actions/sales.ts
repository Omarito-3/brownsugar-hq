"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { salesEntrySchema, type SalesEntryInput } from "@/lib/validations/sales";

export type SalesActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; duplicateEntryId?: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function createSalesEntry(input: SalesEntryInput): Promise<SalesActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };

  const parsed = salesEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { role, branchId: userBranchId } = session.user;
  const branchId = role === "OWNER" ? parsed.data.branchId : userBranchId;
  if (!branchId) return { ok: false, error: "Your account has no branch assigned." };

  const date = toDate(parsed.data.date);

  const existing = await prisma.salesEntry.findUnique({
    where: { branchId_date: { branchId, date } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "Entry for this branch and date already exists.",
      duplicateEntryId: existing.id,
    };
  }

  try {
    const entry = await prisma.salesEntry.create({
      data: {
        branchId,
        date,
        totalIls: parsed.data.totalIls,
        orderCount: parsed.data.orderCount,
        notes: parsed.data.notes || null,
        enteredById: session.user.id,
        lineItems: {
          create: parsed.data.lineItems.map((li) => ({
            productId: li.productId,
            quantity: li.quantity,
          })),
        },
      },
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { ok: true, id: entry.id };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      const dup = await prisma.salesEntry.findUnique({
        where: { branchId_date: { branchId, date } },
        select: { id: true },
      });
      return {
        ok: false,
        error: "Entry for this branch and date already exists.",
        duplicateEntryId: dup?.id,
      };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function updateSalesEntry(
  id: string,
  input: SalesEntryInput
): Promise<SalesActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };

  const existingEntry = await prisma.salesEntry.findUnique({
    where: { id },
    select: { branchId: true },
  });
  if (!existingEntry) return { ok: false, error: "Entry not found." };

  const { role, branchId: userBranchId } = session.user;
  const canEdit = role === "OWNER" || existingEntry.branchId === userBranchId;
  if (!canEdit) return { ok: false, error: "You don't have permission to edit this entry." };

  const parsed = salesEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const branchId = role === "OWNER" ? parsed.data.branchId : userBranchId!;
  const date = toDate(parsed.data.date);

  const conflicting = await prisma.salesEntry.findUnique({
    where: { branchId_date: { branchId, date } },
    select: { id: true },
  });
  if (conflicting && conflicting.id !== id) {
    return {
      ok: false,
      error: "Entry for this branch and date already exists.",
      duplicateEntryId: conflicting.id,
    };
  }

  try {
    await prisma.$transaction([
      prisma.salesLineItem.deleteMany({ where: { salesEntryId: id } }),
      prisma.salesEntry.update({
        where: { id },
        data: {
          branchId,
          date,
          totalIls: parsed.data.totalIls,
          orderCount: parsed.data.orderCount,
          notes: parsed.data.notes || null,
          lineItems: {
            create: parsed.data.lineItems.map((li) => ({
              productId: li.productId,
              quantity: li.quantity,
            })),
          },
        },
      }),
    ]);

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, error: "Entry for this branch and date already exists." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function deleteSalesEntry(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };
  if (session.user.role !== "OWNER") {
    return { ok: false, error: "Only owners can delete sales entries." };
  }

  await prisma.$transaction([
    prisma.salesLineItem.deleteMany({ where: { salesEntryId: id } }),
    prisma.salesEntry.delete({ where: { id } }),
  ]);

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true };
}
