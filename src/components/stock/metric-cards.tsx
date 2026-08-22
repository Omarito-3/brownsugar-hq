"use client";

import { AlertOctagon, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { MetricCard } from "@/components/shared/metric-card";
import { formatIls, formatNumber } from "@/lib/format";
import type { getStockMetrics } from "@/lib/queries/stock";

type StockMetrics = Awaited<ReturnType<typeof getStockMetrics>>;

export function StockMetricCards({ metrics }: { metrics: StockMetrics }) {
  const t = useTranslations("stock");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MetricCard
        label={t("purchaseSpendMonth")}
        value={formatIls(metrics.purchaseSpendThisMonth)}
        icon={ShoppingBag}
        delay={0}
      />
      <MetricCard
        label={t("wasteEventsMonth")}
        value={formatNumber(metrics.wasteCountThisMonth)}
        icon={AlertOctagon}
        delay={0.05}
      />
    </div>
  );
}
