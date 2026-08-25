"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  profileSchema,
  changePasswordSchema,
  type ProfileInput,
  type ChangePasswordInput,
} from "@/lib/validations/account";

export type AccountActionResult = { ok: true } | { ok: false; error: string };

const BCRYPT_ROUNDS = 10;

/** Any signed-in user may rename themselves. Role and branch are not editable here. */
export async function updateOwnProfile(input: ProfileInput): Promise<AccountActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("account"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const parsed = profileSchema(t).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/settings/account");
  return { ok: true };
}

/**
 * Changes the signed-in user's own password.
 *
 * The current password is re-verified against the database rather than trusted
 * from the session, so a hijacked session alone can't be used to lock the real
 * owner out of their account.
 */
export async function changeOwnPassword(
  input: ChangePasswordInput
): Promise<AccountActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("account"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const parsed = changePasswordSchema(t).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: tc("notAuthenticated") };

  const currentMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) return { ok: false, error: t("actions.currentPasswordWrong") };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS) },
  });

  revalidatePath("/settings/account");
  return { ok: true };
}
