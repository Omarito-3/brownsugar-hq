"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { menuExperimentSchema, type MenuExperimentInput } from "@/lib/validations/marketing";

export type ExperimentActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

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

export async function createMenuExperiment(input: MenuExperimentInput): Promise<ExperimentActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("marketing"),
    getTranslations("common"),
  ]);
  const parsed = menuExperimentSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = parsed.data.branchId || null;
  const access = await requireManagerAccess(branchId);
  if (!access.ok) return access;

  const experiment = await prisma.menuExperiment.create({
    data: {
      productName: parsed.data.productName,
      notes: parsed.data.notes,
      status: parsed.data.status,
      branchId,
    },
  });

  revalidatePath("/marketing");
  return { ok: true, id: experiment.id };
}

export async function updateMenuExperiment(
  id: string,
  input: MenuExperimentInput
): Promise<ExperimentActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("marketing"),
    getTranslations("common"),
  ]);

  const existing = await prisma.menuExperiment.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("marketing.actions");
    return { ok: false, error: t("experimentNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  const parsed = menuExperimentSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = parsed.data.branchId || null;
  const targetAccess = await requireManagerAccess(branchId);
  if (!targetAccess.ok) return targetAccess;

  await prisma.menuExperiment.update({
    where: { id },
    data: {
      productName: parsed.data.productName,
      notes: parsed.data.notes,
      status: parsed.data.status,
      branchId,
    },
  });

  revalidatePath("/marketing");
  return { ok: true, id };
}

export async function deleteMenuExperiment(id: string): Promise<SimpleActionResult> {
  const existing = await prisma.menuExperiment.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("marketing.actions");
    return { ok: false, error: t("experimentNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  await prisma.menuExperiment.delete({ where: { id } });

  revalidatePath("/marketing");
  return { ok: true };
}
