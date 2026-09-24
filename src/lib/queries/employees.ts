import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber, toDateKey } from "@/lib/format";

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Salary visibility is decided by the caller (see `canViewSalaries`) and passed
 * in explicitly. With `includeSalary: false` salary figures are never read from
 * the database, so they cannot reach the client even by accident.
 */
export type SalaryVisibility = { includeSalary: boolean };

export type EmployeeMetrics = {
  activeCount: number;
  /** null when the caller may not see salaries. */
  totalSalaryIls: number | null;
  laborCostPercent: number | null;
};

export async function getEmployeeMetrics(
  branchId: string | undefined,
  { includeSalary }: SalaryVisibility
): Promise<EmployeeMetrics> {
  const where = { isActive: true, ...(branchId ? { branchId } : {}) };

  if (!includeSalary) {
    const activeCount = await prisma.employee.count({ where });
    return { activeCount, totalSalaryIls: null, laborCostPercent: null };
  }

  const start = monthStart();

  const [activeAgg, salesAgg] = await Promise.all([
    prisma.employee.aggregate({
      where,
      _count: { _all: true },
      _sum: { salaryIls: true },
    }),
    prisma.salesEntry.aggregate({
      where: { date: { gte: start }, ...(branchId ? { branchId } : {}) },
      _sum: { totalIls: true },
    }),
  ]);

  const totalSalaryIls = toNumber(activeAgg._sum.salaryIls);
  const revenue = toNumber(salesAgg._sum.totalIls);

  return {
    activeCount: activeAgg._count._all,
    totalSalaryIls,
    laborCostPercent: revenue > 0 ? (totalSalaryIls / revenue) * 100 : null,
  };
}

export async function getEmployeeCostByBranch(
  branchId: string | undefined,
  { includeSalary }: SalaryVisibility
) {
  const branches = await (branchId
    ? prisma.branch.findMany({ where: { id: branchId }, select: { id: true, name: true } })
    : prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }));

  const rows = await prisma.employee.groupBy({
    by: ["branchId"],
    where: { isActive: true, ...(branchId ? { branchId } : {}) },
    _count: { _all: true },
    ...(includeSalary ? { _sum: { salaryIls: true } } : {}),
  });

  const byBranch = new Map(
    rows.map((r) => [
      r.branchId,
      { count: r._count._all, salary: includeSalary ? toNumber(r._sum?.salaryIls) : null },
    ])
  );

  return branches.map((b) => {
    const stats = byBranch.get(b.id) ?? { count: 0, salary: includeSalary ? 0 : null };
    return {
      branchId: b.id,
      branchName: b.name,
      employeeCount: stats.count,
      /** null when the caller may not see salaries. */
      salaryCostIls: stats.salary,
    };
  });
}

export type EmployeeRow = {
  id: string;
  name: string;
  phone: string | null;
  branchId: string;
  branchName: string;
  position: string;
  /** null when the caller may not see salaries. */
  salaryIls: number | null;
  startDate: string;
  isActive: boolean;
  notes: string | null;
};

export async function getEmployeesTable(
  branchId: string | undefined,
  { includeSalary }: SalaryVisibility
): Promise<EmployeeRow[]> {
  const employees = await prisma.employee.findMany({
    where: branchId ? { branchId } : {},
    omit: { salaryIls: !includeSalary },
    include: { branch: { select: { name: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    phone: e.phone,
    branchId: e.branchId,
    branchName: e.branch.name,
    position: e.position as string,
    salaryIls: includeSalary ? toNumber(e.salaryIls) : null,
    startDate: toDateKey(e.startDate),
    isActive: e.isActive,
    notes: e.notes,
  }));
}

export async function getEmployeeForEdit(id: string, { includeSalary }: SalaryVisibility) {
  const e = await prisma.employee.findUnique({ where: { id }, omit: { salaryIls: !includeSalary } });
  if (!e) return null;

  return {
    id: e.id,
    name: e.name,
    phone: e.phone ?? "",
    branchId: e.branchId,
    position: e.position,
    salaryIls: includeSalary ? toNumber(e.salaryIls) : null,
    startDate: toDateKey(e.startDate),
    notes: e.notes ?? "",
  };
}

export async function getEmployeesForBranch(branchId: string) {
  return prisma.employee.findMany({
    where: { branchId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getActiveEmployeesGrouped(
  scopedBranchId?: string
): Promise<Record<string, { id: string; name: string }[]>> {
  const employees = await prisma.employee.findMany({
    where: { isActive: true, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
    select: { id: true, name: true, branchId: true },
    orderBy: { name: "asc" },
  });

  const map: Record<string, { id: string; name: string }[]> = {};
  for (const e of employees) {
    (map[e.branchId] ??= []).push({ id: e.id, name: e.name });
  }
  return map;
}

/** Sunday-start week containing the given date key, in UTC. */
export function weekStartFromKey(anchorKey: string): Date {
  const ref = new Date(`${anchorKey}T00:00:00.000Z`);
  const day = ref.getUTCDay();
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() - day));
}

export type ScheduleShiftGroups = Record<"MORNING" | "EVENING" | "FULL_DAY", { id: string; name: string }[]>;

export type ScheduleDayBranch = {
  branchId: string;
  branchName: string;
  hasGap: boolean;
  shifts: ScheduleShiftGroups;
};

export type ScheduleDay = {
  dateKey: string;
  branches: ScheduleDayBranch[];
};

export async function getWeeklySchedule(anchorKey: string, scopedBranchId?: string): Promise<ScheduleDay[]> {
  const start = weekStartFromKey(anchorKey);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const [branches, employees, assignments] = await Promise.all([
    scopedBranchId
      ? prisma.branch.findMany({ where: { id: scopedBranchId }, select: { id: true, name: true } })
      : prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    prisma.employee.findMany({
      where: { isActive: true, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      select: { id: true, branchId: true },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        date: { gte: start, lt: end },
        employee: { isActive: true, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      },
      select: {
        date: true,
        shift: true,
        employee: { select: { id: true, name: true, branchId: true } },
      },
    }),
  ]);

  const activeCountByBranch = new Map<string, number>();
  for (const e of employees) {
    activeCountByBranch.set(e.branchId, (activeCountByBranch.get(e.branchId) ?? 0) + 1);
  }

  const byDayBranch = new Map<string, ScheduleShiftGroups>();
  for (const a of assignments) {
    const dateKey = toDateKey(a.date);
    const key = `${dateKey}|${a.employee.branchId}`;
    if (!byDayBranch.has(key)) {
      byDayBranch.set(key, { MORNING: [], EVENING: [], FULL_DAY: [] });
    }
    const shift = a.shift as "MORNING" | "EVENING" | "FULL_DAY";
    byDayBranch.get(key)![shift].push({ id: a.employee.id, name: a.employee.name });
  }

  const days: ScheduleDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateKey = toDateKey(d);

    const dayBranches: ScheduleDayBranch[] = branches.map((b) => {
      const key = `${dateKey}|${b.id}`;
      const shifts = byDayBranch.get(key) ?? { MORNING: [], EVENING: [], FULL_DAY: [] };
      const totalAssigned = shifts.MORNING.length + shifts.EVENING.length + shifts.FULL_DAY.length;
      const activeCount = activeCountByBranch.get(b.id) ?? 0;
      return {
        branchId: b.id,
        branchName: b.name,
        hasGap: activeCount > 0 && totalAssigned === 0,
        shifts,
      };
    });

    days.push({ dateKey, branches: dayBranches });
  }

  return days;
}

export type CoverageGap = { branchId: string; branchName: string };

export async function getTodayCoverageGaps(scopedBranchId?: string): Promise<CoverageGap[]> {
  const todayKey = toDateKey(new Date());
  const today = new Date(`${todayKey}T00:00:00.000Z`);

  const [branches, employees, assignments] = await Promise.all([
    scopedBranchId
      ? prisma.branch.findMany({ where: { id: scopedBranchId }, select: { id: true, name: true } })
      : prisma.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    prisma.employee.findMany({
      where: { isActive: true, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      select: { branchId: true },
    }),
    prisma.shiftAssignment.findMany({
      where: {
        date: today,
        employee: { isActive: true, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      },
      select: { employee: { select: { branchId: true } } },
    }),
  ]);

  const activeBranches = new Set(employees.map((e) => e.branchId));
  const coveredBranches = new Set(assignments.map((a) => a.employee.branchId));

  return branches
    .filter((b) => activeBranches.has(b.id) && !coveredBranches.has(b.id))
    .map((b) => ({ branchId: b.id, branchName: b.name }));
}
