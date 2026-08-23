"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { feedbackSchema, type FeedbackInput } from "@/lib/validations/marketing";

export type FeedbackActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

async function requireManagerAccess(targetBranchId: string) {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("marketing.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };

  const { role, branchId: userBranchId } = session.user;
  if (role === "OWNER") return { ok: true as const, session };
  if (role === "MANAGER" && targetBranchId === userBranchId) {
    return { ok: true as const, session };
  }
  return { ok: false as const, error: t("noPermission") };
}

export async function createFeedback(input: FeedbackInput): Promise<FeedbackActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("marketing"),
    getTranslations("common"),
  ]);
  const parsed = feedbackSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const access = await requireManagerAccess(parsed.data.branchId);
  if (!access.ok) return access;

  const feedback = await prisma.feedback.create({
    data: {
      branchId: parsed.data.branchId,
      date: toDate(parsed.data.date),
      source: parsed.data.source,
      sentiment: parsed.data.sentiment,
      content: parsed.data.content,
    },
  });

  revalidatePath("/marketing");
  return { ok: true, id: feedback.id };
}

export async function updateFeedback(id: string, input: FeedbackInput): Promise<FeedbackActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("marketing"),
    getTranslations("common"),
  ]);

  const existing = await prisma.feedback.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("marketing.actions");
    return { ok: false, error: t("feedbackNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  const parsed = feedbackSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const targetAccess = await requireManagerAccess(parsed.data.branchId);
  if (!targetAccess.ok) return targetAccess;

  await prisma.feedback.update({
    where: { id },
    data: {
      branchId: parsed.data.branchId,
      date: toDate(parsed.data.date),
      source: parsed.data.source,
      sentiment: parsed.data.sentiment,
      content: parsed.data.content,
    },
  });

  revalidatePath("/marketing");
  return { ok: true, id };
}

export async function deleteFeedback(id: string): Promise<SimpleActionResult> {
  const existing = await prisma.feedback.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("marketing.actions");
    return { ok: false, error: t("feedbackNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  await prisma.feedback.delete({ where: { id } });

  revalidatePath("/marketing");
  return { ok: true };
}
