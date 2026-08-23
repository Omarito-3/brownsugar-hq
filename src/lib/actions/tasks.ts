"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema, taskStatusValues, type TaskInput } from "@/lib/validations/management";

export type TaskActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

function toDate(dateKey: string): Date | null {
  return dateKey ? new Date(`${dateKey}T00:00:00.000Z`) : null;
}

/** OWNER manages any branch (or org-wide); MANAGER only their own branch. STAFF has no write access here. */
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

export async function createTask(input: TaskInput): Promise<TaskActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("management"),
    getTranslations("common"),
  ]);
  const parsed = taskSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = parsed.data.branchId || null;
  const access = await requireManagerAccess(branchId);
  if (!access.ok) return access;

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      branchId,
      assignedToId: parsed.data.assignedToId || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: toDate(parsed.data.dueDate || ""),
      createdById: access.session.user.id,
    },
  });

  revalidatePath("/management");
  revalidatePath("/dashboard");
  return { ok: true, id: task.id };
}

export async function updateTask(id: string, input: TaskInput): Promise<TaskActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("management"),
    getTranslations("common"),
  ]);

  const existing = await prisma.task.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("management.actions");
    return { ok: false, error: t("taskNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  const parsed = taskSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const branchId = parsed.data.branchId || null;
  const targetAccess = await requireManagerAccess(branchId);
  if (!targetAccess.ok) return targetAccess;

  await prisma.task.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      branchId,
      assignedToId: parsed.data.assignedToId || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: toDate(parsed.data.dueDate || ""),
      completedAt: parsed.data.status === "DONE" ? new Date() : null,
    },
  });

  revalidatePath("/management");
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function setTaskStatus(
  id: string,
  status: (typeof taskStatusValues)[number]
): Promise<SimpleActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("management.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const task = await prisma.task.findUnique({
    where: { id },
    select: { branchId: true, assignedToId: true },
  });
  if (!task) return { ok: false, error: t("taskNotFound") };

  const { role, branchId: userBranchId, id: userId } = session.user;
  const canManage =
    role === "OWNER" || (role === "MANAGER" && task.branchId && task.branchId === userBranchId);
  const isOwnTask = task.assignedToId === userId;

  if (!canManage && !isOwnTask) {
    return { ok: false, error: t("noPermission") };
  }

  await prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });

  revalidatePath("/management");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<SimpleActionResult> {
  const existing = await prisma.task.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("management.actions");
    return { ok: false, error: t("taskNotFound") };
  }

  const access = await requireManagerAccess(existing.branchId);
  if (!access.ok) return access;

  await prisma.task.delete({ where: { id } });

  revalidatePath("/management");
  revalidatePath("/dashboard");
  return { ok: true };
}
