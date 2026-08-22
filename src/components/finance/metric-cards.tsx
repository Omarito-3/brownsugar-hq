"use client";

import { Wallet, Receipt, TrendingUp, Percent } from "lucide-react";
import { useTranslations } from "next-intl";

import { MetricCard } from "@/components/shared/metric-card";
import { formatIls, formatPercent } from "@/lib/format";
import type { FinanceMetrics } from "@/lib/queries/finance";

export function FinanceMetricCards({ metrics }: { metrics: FinanceMetrics }) {
  const t = useTranslations("finance");
  const isProfit = metrics.netProfit >= 0;
  const margin = metrics.profitMarginPercent;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label={t("totalExpenses")} value={formatIls(metrics.totalExpenses)} icon={Receipt} delay={0} />
      <MetricCard label={t("totalRevenue")} value={formatIls(metrics.totalRevenue)} icon={Wallet} delay={0.05} />
      <MetricCard
        label={t("netProfit")}
        value={formatIls(metrics.netProfit)}
        icon={TrendingUp}
        delay={0.1}
        valueClassName={isProfit ? "text-emerald-500" : "text-destructive"}
      />
      <MetricCard
        label={t("profitMargin")}
        value={margin == null ? "—" : formatPercent(margin, { showSign: false })}
        icon={Percent}
        delay={0.15}
        valueClassName={margin == null ? undefined : margin >= 0 ? "text-emerald-500" : "text-destructive"}
      />
    </div>
  );
}
