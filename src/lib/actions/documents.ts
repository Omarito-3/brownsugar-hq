"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { documentSchema, type DocumentInput } from "@/lib/validations/management";

export type DocumentActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

function toDate(dateKey: string): Date | null {
  return dateKey ? new Date(`${dateKey}T00:00:00.000Z`) : null;
}

async function requireManagerAccess(targetBranchId: string | null) {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("management.actions"),
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

export async function createDocument(input: DocumentInput): Promise<DocumentActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("management"),
    getTranslations("common"),
  ]);
  const parsed = documentSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = parsed.data.branchId || null;
  const access = await requireManagerAccess(branchId);
  if (!access.ok) return access;

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      branchId,
      fileUrl: parsed.data.fileUrl,
      expiryDate: toDate(parsed.data.expiryDate || ""),
      notes: parsed.data.notes || null,
      uploadedById: access.session.user.id,
    },
  });

  revalidatePath("/management");
  revalidatePath("/dashboard");
  return { ok: true, id: document.id };
}

export async function deleteDocument(id: string): Promise<SimpleActionResult> {
  const existing = await prisma.document.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("management.actions");
    return { ok: false, error: t("documentNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  await prisma.document.delete({ where: { id } });

  revalidatePath("/management");
  revalidatePath("/dashboard");
  return { ok: true };
}
