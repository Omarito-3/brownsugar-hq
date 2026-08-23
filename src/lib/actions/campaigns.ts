"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency } from "@/lib/format";
import { campaignSchema, type CampaignInput } from "@/lib/validations/marketing";

export type CampaignActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

async function requireManagerAccess(targetBranchId: string | null) {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("marketing.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };

  const { role, branchId: userBranchId } = session.user;
  if (role === "OWNER") return { ok: true as const, session };
  if (role === "MANAGER" && targetBranchId && targetBranchId === userBranchId) {
    return { ok: true as const, session };
  }
  return { ok: false as const, error: t("noPermission") };
}

export async function createCampaign(input: CampaignInput): Promise<CampaignActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("marketing"),
    getTranslations("common"),
  ]);
  const parsed = campaignSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = parsed.data.branchId || null;
  const access = await requireManagerAccess(branchId);
  if (!access.ok) return access;

  let expenseId: string | null = null;
  if (parsed.data.createExpense && branchId && parsed.data.budgetIls && parsed.data.budgetIls > 0) {
    const expense = await prisma.expense.create({
      data: {
        branchId,
        date: toDate(parsed.data.startDate),
        category: "MARKETING",
        amountOriginal: roundCurrency(parsed.data.budgetIls),
        currencyCode: "ILS",
        amountIls: roundCurrency(parsed.data.budgetIls),
        notes: `Campaign: ${parsed.data.name}`,
        enteredById: access.session.user.id,
      },
    });
    expenseId = expense.id;
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      branchId,
      startDate: toDate(parsed.data.startDate),
      endDate: toDate(parsed.data.endDate),
      budgetIls: parsed.data.budgetIls ?? null,
      channel: parsed.data.channel,
      notes: parsed.data.notes || null,
      expenseId,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true, id: campaign.id };
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<CampaignActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("marketing"),
    getTranslations("common"),
  ]);

  const existing = await prisma.campaign.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("marketing.actions");
    return { ok: false, error: t("campaignNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  const parsed = campaignSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = parsed.data.branchId || null;
  const targetAccess = await requireManagerAccess(branchId);
  if (!targetAccess.ok) return targetAccess;

  await prisma.campaign.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      branchId,
      startDate: toDate(parsed.data.startDate),
      endDate: toDate(parsed.data.endDate),
      budgetIls: parsed.data.budgetIls ?? null,
      channel: parsed.data.channel,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function deleteCampaign(id: string): Promise<SimpleActionResult> {
  const existing = await prisma.campaign.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("marketing.actions");
    return { ok: false, error: t("campaignNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  await prisma.campaign.delete({ where: { id } });

  revalidatePath("/marketing");
  revalidatePath("/dashboard");
  return { ok: true };
}
