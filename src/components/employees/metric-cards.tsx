"use client";

import { Users, Wallet, Percent } from "lucide-react";
import { useTranslations } from "next-intl";

import { MetricCard } from "@/components/shared/metric-card";
import { formatIls, formatNumber, formatPercent } from "@/lib/format";
import type { EmployeeMetrics } from "@/lib/queries/employees";

export function EmployeeMetricCards({
  metrics,
  showSalary,
}: {
  metrics: EmployeeMetrics;
  showSalary: boolean;
}) {
  const t = useTranslations("employees");

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${showSalary ? "lg:grid-cols-3" : ""}`}>
      <MetricCard
        label={t("activeEmployees")}
        value={formatNumber(metrics.activeCount)}
        icon={Users}
        delay={0}
      />
      {showSalary && (
        <>
          <MetricCard
            label={t("monthlySalaryCost")}
            value={formatIls(metrics.totalSalaryIls)}
            icon={Wallet}
            delay={0.05}
          />
          <MetricCard
            label={t("laborCostPercent")}
            value={metrics.laborCostPercent == null ? "—" : formatPercent(metrics.laborCostPercent, { showSign: false })}
            icon={Percent}
            delay={0.1}
          />
        </>
      )}
    </div>
  );
}
