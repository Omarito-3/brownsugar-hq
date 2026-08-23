"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toNumber, roundCurrency } from "@/lib/format";
import { generateSalarySchema, type GenerateSalaryInput } from "@/lib/validations/employees";

export type GenerateSalaryResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string };

const SALARY_MARKER_PREFIX = "salary-gen:";

function monthStartDate(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export async function generateSalaryExpenses(input: GenerateSalaryInput): Promise<GenerateSalaryResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("employees.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER") return { ok: false, error: t("ownerOnlySalary") };

  const parsed = generateSalarySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: tc("invalidInput") };

  const date = monthStartDate(parsed.data.month);
  const marker = `${SALARY_MARKER_PREFIX}${parsed.data.month}`;

  const [branches, employees, existingExpenses] = await Promise.all([
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.employee.findMany({ where: { isActive: true }, select: { branchId: true, salaryIls: true } }),
    prisma.expense.findMany({
      where: { category: "SALARY", notes: { contains: marker } },
      select: { branchId: true },
    }),
  ]);

  const alreadyGenerated = new Set(existingExpenses.map((e) => e.branchId));

  const salaryByBranch = new Map<string, number>();
  for (const e of employees) {
    salaryByBranch.set(e.branchId, (salaryByBranch.get(e.branchId) ?? 0) + toNumber(e.salaryIls));
  }

  let created = 0;
  let skipped = 0;

  for (const branch of branches) {
    const total = roundCurrency(salaryByBranch.get(branch.id) ?? 0);
    if (total <= 0 || alreadyGenerated.has(branch.id)) {
      skipped++;
      continue;
    }

    await prisma.expense.create({
      data: {
        branchId: branch.id,
        date,
        category: "SALARY",
        amountOriginal: total,
        currencyCode: "ILS",
        amountIls: total,
        notes: `${marker} — ${branch.name}`,
        enteredById: session.user.id,
      },
    });
    created++;
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true, created, skipped };
}
