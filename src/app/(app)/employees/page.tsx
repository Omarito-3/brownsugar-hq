import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { canViewSalaries, getBranchScope } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { EmployeeMetricCards } from "@/components/employees/metric-cards";
import { BranchEmployeeCards } from "@/components/employees/branch-employee-cards";
import { EmployeesTable } from "@/components/employees/employees-table";
import { GenerateSalaryButton } from "@/components/employees/generate-salary-button";
import { getBranchesForUser } from "@/lib/queries/shared";
import {
  getEmployeeMetrics,
  getEmployeeCostByBranch,
  getEmployeesTable,
} from "@/lib/queries/employees";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "STAFF") redirect("/employees/schedule");

  const t = await getTranslations("employees");
  const isOwner = session.user.role === "OWNER";
  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  // Salary figures are OWNER-only and are filtered out in the queries, not just hidden here.
  const showSalary = canViewSalaries(session.user.role);
  const salaryVisibility = { includeSalary: showSalary };

  const [metrics, branchCosts, employees, branches] = await Promise.all([
    getEmployeeMetrics(scopedBranchId, salaryVisibility),
    getEmployeeCostByBranch(scopedBranchId, salaryVisibility),
    getEmployeesTable(scopedBranchId, salaryVisibility),
    getBranchesForUser(scopedBranchId),
  ]);

  return (
    <div className="space-y-8">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && <GenerateSalaryButton />}
          <Button asChild variant="outline" size="lg" className="h-12 text-base">
            <Link href="/employees/schedule">
              <CalendarDays className="size-4" />
              {t("scheduleLink")}
            </Link>
          </Button>
        </div>
      </FadeIn>

      <EmployeeMetricCards metrics={metrics} showSalary={showSalary} />

      <div className="space-y-3">
        <FadeIn delay={0.05}>
          <h2 className="text-lg font-medium">{t("branchCosts")}</h2>
        </FadeIn>
        <BranchEmployeeCards data={branchCosts} showSalary={showSalary} />
      </div>

      <EmployeesTable
        employees={employees}
        branches={branches}
        isOwner={isOwner}
        showSalary={showSalary}
        canManage
        defaultBranchId={scopedBranchId ?? ""}
      />
    </div>
  );
}
