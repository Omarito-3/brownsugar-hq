"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toNumber, roundCurrency } from "@/lib/format";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/finance";

export type ExpenseActionResult = { ok: true; id: string } | { ok: false; error: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Server is the source of truth for exchange rates — never trust a client-submitted amountIls. */
async function resolveAmountIls(
  currencyCode: string,
  amountOriginal: number
): Promise<{ ok: true; amountIls: number } | { ok: false; error: string }> {
  const currency = await prisma.currency.findUnique({ where: { code: currencyCode } });
  if (!currency) return { ok: false, error: `Unknown currency: ${currencyCode}` };
  return { ok: true, amountIls: roundCurrency(amountOriginal * toNumber(currency.rateToIls)) };
}

export async function createExpense(input: ExpenseInput): Promise<ExpenseActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("finance.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const tv = await getTranslations("finance.validation");
  const parsed = expenseSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const { role, branchId: userBranchId } = session.user;
  const branchId = role === "OWNER" ? parsed.data.branchId : userBranchId;
  if (!branchId) return { ok: false, error: t("noBranchAssigned") };

  const resolved = await resolveAmountIls(parsed.data.currencyCode, parsed.data.amountOriginal);
  if (!resolved.ok) return resolved;

  // NOTE: SALARY-category expenses will eventually link to the Employees module
  // (e.g. an optional employeeId) once that module exists. Plain expense for now.
  const expense = await prisma.expense.create({
    data: {
      branchId,
      date: toDate(parsed.data.date),
      category: parsed.data.category,
      amountOriginal: parsed.data.amountOriginal,
      currencyCode: parsed.data.currencyCode,
      amountIls: resolved.amountIls,
      notes: parsed.data.notes || null,
      receiptUrl: parsed.data.receiptUrl || null,
      enteredById: session.user.id,
    },
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true, id: expense.id };
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<ExpenseActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("finance.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const existing = await prisma.expense.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) return { ok: false, error: t("expenseNotFound") };

  const { role, branchId: userBranchId } = session.user;
  const canEdit = role === "OWNER" || existing.branchId === userBranchId;
  if (!canEdit) return { ok: false, error: t("noPermissionEdit") };

  const tv = await getTranslations("finance.validation");
  const parsed = expenseSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = role === "OWNER" ? parsed.data.branchId : userBranchId!;

  const resolved = await resolveAmountIls(parsed.data.currencyCode, parsed.data.amountOriginal);
  if (!resolved.ok) return resolved;

  await prisma.expense.update({
    where: { id },
    data: {
      branchId,
      date: toDate(parsed.data.date),
      category: parsed.data.category,
      amountOriginal: parsed.data.amountOriginal,
      currencyCode: parsed.data.currencyCode,
      amountIls: resolved.amountIls,
      notes: parsed.data.notes || null,
      receiptUrl: parsed.data.receiptUrl || null,
    },
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function deleteExpense(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("finance.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: t("expenseNotFound") };

  if (session.user.role !== "OWNER") {
    return { ok: false, error: t("ownerOnlyDelete") };
  }

  await prisma.expense.delete({ where: { id } });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true };
}
