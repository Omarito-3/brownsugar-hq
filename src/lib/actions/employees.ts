"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employees";
import { canViewSalaries } from "@/lib/permissions";

export type EmployeeActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

async function requireAccess(targetBranchId?: string) {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("employees.actions"),
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

export async function createEmployee(input: EmployeeInput): Promise<EmployeeActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("employees"),
    getTranslations("common"),
  ]);
  const parsed = employeeSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const access = await requireAccess(parsed.data.branchId);
  if (!access.ok) return access;

  // Salary is OWNER-only (D-016). A non-owner's submitted salary is ignored and the
  // record starts at 0 for the owner to fill in; an OWNER must provide one.
  const ownerSetsSalary = canViewSalaries(access.session.user.role);
  if (ownerSetsSalary && parsed.data.salaryIls == null) {
    return { ok: false, error: tv("validation.salaryPositive") };
  }

  const employee = await prisma.employee.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      branchId: parsed.data.branchId,
      position: parsed.data.position,
      salaryIls: ownerSetsSalary ? parsed.data.salaryIls! : 0,
      startDate: toDate(parsed.data.startDate),
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/employees");
  revalidatePath("/employees/schedule");
  revalidatePath("/dashboard");
  return { ok: true, id: employee.id };
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<EmployeeActionResult> {
  const [tv, tc] = await Promise.all([
    getTranslations("employees"),
    getTranslations("common"),
  ]);

  const existing = await prisma.employee.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("employees.actions");
    return { ok: false, error: t("employeeNotFound") };
  }

  const access = await requireAccess(existing.branchId);
  if (!access.ok) return access;

  const parsed = employeeSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  // MANAGERs may only move an employee within their own branch — re-check the target branch too.
  const targetAccess = await requireAccess(parsed.data.branchId);
  if (!targetAccess.ok) return targetAccess;

  // Salary is OWNER-only (D-016): a non-owner's update never touches it, whatever
  // the request contains. An OWNER must provide one.
  const ownerSetsSalary = canViewSalaries(access.session.user.role);
  if (ownerSetsSalary && parsed.data.salaryIls == null) {
    return { ok: false, error: tv("validation.salaryPositive") };
  }

  await prisma.employee.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      branchId: parsed.data.branchId,
      position: parsed.data.position,
      ...(ownerSetsSalary ? { salaryIls: parsed.data.salaryIls } : {}),
      startDate: toDate(parsed.data.startDate),
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/employees");
  revalidatePath("/employees/schedule");
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function setEmployeeActive(id: string, isActive: boolean): Promise<SimpleActionResult> {
  const existing = await prisma.employee.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("employees.actions");
    return { ok: false, error: t("employeeNotFound") };
  }

  const access = await requireAccess(existing.branchId);
  if (!access.ok) return access;

  await prisma.employee.update({ where: { id }, data: { isActive } });

  revalidatePath("/employees");
  revalidatePath("/employees/schedule");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEmployee(id: string): Promise<SimpleActionResult> {
  const existing = await prisma.employee.findUnique({ where: { id }, select: { branchId: true } });
  if (!existing) {
    const t = await getTranslations("employees.actions");
    return { ok: false, error: t("employeeNotFound") };
  }

  const access = await requireAccess(existing.branchId);
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([
    getTranslations("employees.actions"),
    getTranslations("common"),
  ]);

  try {
    await prisma.employee.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { ok: false, error: t("employeeHasHistory") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }

  revalidatePath("/employees");
  revalidatePath("/employees/schedule");
  revalidatePath("/dashboard");
  return { ok: true };
}
