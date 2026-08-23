"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dayScheduleSchema, type DayScheduleInput } from "@/lib/validations/employees";

export type ScheduleActionResult = { ok: true } | { ok: false; error: string };

function toDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export async function setDaySchedule(input: DayScheduleInput): Promise<ScheduleActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("employees.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const parsed = dayScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tc("invalidInput") };
  }

  const { role, branchId: userBranchId } = session.user;
  const { branchId, date, assignments } = parsed.data;

  if (role === "STAFF") return { ok: false, error: t("noPermission") };
  if (role === "MANAGER" && branchId !== userBranchId) return { ok: false, error: t("noPermission") };

  // Guard against employees from another branch being slipped into the payload.
  const employeeIds = assignments.map((a) => a.employeeId);
  const validEmployees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, branchId },
    select: { id: true },
  });
  const validIds = new Set(validEmployees.map((e) => e.id));

  const dateValue = toDate(date);

  await prisma.$transaction(
    assignments
      .filter((a) => validIds.has(a.employeeId))
      .map((a) =>
        a.shift === null
          ? prisma.shiftAssignment.deleteMany({
              where: { employeeId: a.employeeId, date: dateValue },
            })
          : prisma.shiftAssignment.upsert({
              where: { employeeId_date: { employeeId: a.employeeId, date: dateValue } },
              update: { shift: a.shift },
              create: { employeeId: a.employeeId, date: dateValue, shift: a.shift },
            })
      )
  );

  revalidatePath("/employees/schedule");
  revalidatePath("/dashboard");
  return { ok: true };
}
