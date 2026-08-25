"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type ResetPasswordInput,
} from "@/lib/validations/account";

export type UserActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

const BCRYPT_ROUNDS = 10;

async function requireOwner() {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("users"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER") return { ok: false as const, error: t("actions.ownerOnly") };
  return { ok: true as const, session };
}

/** MANAGER and STAFF are meaningless without a branch; OWNER is org-wide. */
function resolveBranchId(role: string, branchId: string | undefined): string | null {
  if (role === "OWNER") return null;
  return branchId || null;
}

export async function createUser(input: CreateUserInput): Promise<UserActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([getTranslations("users"), getTranslations("common")]);
  const parsed = createUserSchema(t).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = resolveBranchId(parsed.data.role, parsed.data.branchId);
  if (parsed.data.role !== "OWNER" && !branchId) {
    return { ok: false, error: t("actions.branchRequiredForRole") };
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS),
        role: parsed.data.role,
        branchId,
      },
    });

    revalidatePath("/settings/users");
    return { ok: true, id: user.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: t("actions.emailTaken") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([getTranslations("users"), getTranslations("common")]);
  const parsed = updateUserSchema(t).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return { ok: false, error: t("actions.userNotFound") };

  // Guard against locking yourself out of the only role that can manage users.
  const isSelf = id === access.session.user.id;
  if (isSelf && parsed.data.role !== "OWNER") {
    return { ok: false, error: t("actions.cannotDemoteSelf") };
  }

  const branchId = resolveBranchId(parsed.data.role, parsed.data.branchId);
  if (parsed.data.role !== "OWNER" && !branchId) {
    return { ok: false, error: t("actions.branchRequiredForRole") };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        branchId,
      },
    });

    revalidatePath("/settings/users");
    return { ok: true, id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: t("actions.emailTaken") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }
}

/**
 * Owner-initiated password reset. Deliberately does not require the target's
 * current password — that's the point of an admin reset — which is why it is
 * gated to OWNER only.
 */
export async function resetUserPassword(
  id: string,
  input: ResetPasswordInput
): Promise<SimpleActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([getTranslations("users"), getTranslations("common")]);
  const parsed = resetPasswordSchema(t).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return { ok: false, error: t("actions.userNotFound") };

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS) },
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function setUserActive(id: string, isActive: boolean): Promise<SimpleActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const t = await getTranslations("users");

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return { ok: false, error: t("actions.userNotFound") };

  if (id === access.session.user.id && !isActive) {
    return { ok: false, error: t("actions.cannotDeactivateSelf") };
  }

  // Never leave the system with no way back in.
  if (!isActive) {
    const otherActiveOwners = await prisma.user.count({
      where: { role: "OWNER", isActive: true, id: { not: id } },
    });
    if (otherActiveOwners === 0) {
      return { ok: false, error: t("actions.lastOwner") };
    }
  }

  await prisma.user.update({ where: { id }, data: { isActive } });

  revalidatePath("/settings/users");
  return { ok: true };
}
