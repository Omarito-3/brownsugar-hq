"use client";

import { Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { formatIls } from "@/lib/format";
import type { getEmployeeCostByBranch } from "@/lib/queries/employees";

type BranchCosts = Awaited<ReturnType<typeof getEmployeeCostByBranch>>;

export function BranchEmployeeCards({ data, showSalary }: { data: BranchCosts; showSalary: boolean }) {
  const t = useTranslations("employees");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((branch, i) => (
        <FadeIn key={branch.branchId} delay={0.05 * i}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {branch.branchName}
              </CardTitle>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store className="size-5" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {t("employeesCount", { count: branch.employeeCount })}
              </div>
              {showSalary && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatIls(branch.salaryCostIls)}
                  {t("perMonth")}
                </p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}
