"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { toNumber, roundCurrency } from "@/lib/format";
import {
  salesEntrySchema,
  type SalesEntryInput,
  type SalesCurrencyAmountInput,
} from "@/lib/validations/sales";

export type SalesActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; duplicateEntryId?: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

type ResolvedCurrencyAmounts = {
  rows: { currencyCode: string; amountOriginal: number; amountIls: number }[];
  totalIls: number;
};

/** Server is the source of truth for exchange rates — never trust a client-submitted amountIls. */
async function resolveCurrencyAmounts(
  currencyAmounts: SalesCurrencyAmountInput[]
): Promise<{ ok: true; data: ResolvedCurrencyAmounts } | { ok: false; error: string }> {
  const codes = currencyAmounts.map((c) => c.currencyCode);
  const currencies = await prisma.currency.findMany({ where: { code: { in: codes } } });
  const rateByCode = new Map(currencies.map((c) => [c.code, toNumber(c.rateToIls)]));

  const rows: ResolvedCurrencyAmounts["rows"] = [];
  for (const amount of currencyAmounts) {
    const rate = rateByCode.get(amount.currencyCode);
    if (rate == null) {
      return { ok: false, error: `Unknown currency: ${amount.currencyCode}` };
    }
    rows.push({
      currencyCode: amount.currencyCode,
      amountOriginal: amount.amountOriginal,
      amountIls: roundCurrency(amount.amountOriginal * rate),
    });
  }

  const totalIls = roundCurrency(rows.reduce((sum, r) => sum + r.amountIls, 0));
  return { ok: true, data: { rows, totalIls } };
}

export async function createSalesEntry(input: SalesEntryInput): Promise<SalesActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("sales.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const tv = await getTranslations("sales");
  const parsed = salesEntrySchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const { role, branchId: userBranchId } = session.user;
  const branchId = role === "OWNER" ? parsed.data.branchId : userBranchId;
  if (!branchId) return { ok: false, error: t("noBranchAssigned") };

  const date = toDate(parsed.data.date);

  const existing = await prisma.salesEntry.findUnique({
    where: { branchId_date: { branchId, date } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: t("duplicateEntry"),
      duplicateEntryId: existing.id,
    };
  }

  const resolved = await resolveCurrencyAmounts(parsed.data.currencyAmounts);
  if (!resolved.ok) return resolved;

  try {
    const entry = await prisma.salesEntry.create({
      data: {
        branchId,
        date,
        totalIls: resolved.data.totalIls,
        orderCount: parsed.data.orderCount,
        notes: parsed.data.notes || null,
        enteredById: session.user.id,
        currencyAmounts: { create: resolved.data.rows },
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
        error: t("duplicateEntry"),
        duplicateEntryId: dup?.id,
      };
    }
    return { ok: false, error: tc("somethingWrong") };
  }
}

export async function updateSalesEntry(
  id: string,
  input: SalesEntryInput
): Promise<SalesActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("sales.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const existingEntry = await prisma.salesEntry.findUnique({
    where: { id },
    select: { branchId: true },
  });
  if (!existingEntry) return { ok: false, error: t("entryNotFound") };

  const { role, branchId: userBranchId } = session.user;
  const canEdit = role === "OWNER" || existingEntry.branchId === userBranchId;
  if (!canEdit) return { ok: false, error: t("noPermissionEdit") };

  const tv = await getTranslations("sales");
  const parsed = salesEntrySchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
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
      error: t("duplicateEntry"),
      duplicateEntryId: conflicting.id,
    };
  }

  const resolved = await resolveCurrencyAmounts(parsed.data.currencyAmounts);
  if (!resolved.ok) return resolved;

  try {
    await prisma.$transaction([
      prisma.salesLineItem.deleteMany({ where: { salesEntryId: id } }),
      prisma.salesCurrencyAmount.deleteMany({ where: { salesEntryId: id } }),
      prisma.salesEntry.update({
        where: { id },
        data: {
          branchId,
          date,
          totalIls: resolved.data.totalIls,
          orderCount: parsed.data.orderCount,
          notes: parsed.data.notes || null,
          currencyAmounts: { create: resolved.data.rows },
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
      return { ok: false, error: t("duplicateEntry") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }
}

export async function deleteSalesEntry(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("sales.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER") {
    return { ok: false, error: t("ownerOnlyDelete") };
  }

  await prisma.$transaction([
    prisma.salesLineItem.deleteMany({ where: { salesEntryId: id } }),
    prisma.salesCurrencyAmount.deleteMany({ where: { salesEntryId: id } }),
    prisma.salesEntry.delete({ where: { id } }),
  ]);

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true };
}
