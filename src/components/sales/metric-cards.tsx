"use client";

import { Wallet, ShoppingCart, Receipt, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

import { MetricCard } from "@/components/shared/metric-card";
import { formatIls, formatNumber, formatPercent } from "@/lib/format";
import type { WeeklyMetrics } from "@/lib/queries/sales";

export function SalesMetricCards({ metrics }: { metrics: WeeklyMetrics }) {
  const t = useTranslations("sales");
  const change = metrics.wowChangePercent;
  const isUp = change != null && change > 0;
  const isDown = change != null && change < 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label={t("weekRevenue")}
        value={formatIls(metrics.totalRevenue)}
        icon={Wallet}
        delay={0}
      />
      <MetricCard
        label={t("totalOrders")}
        value={formatNumber(metrics.totalOrders)}
        icon={ShoppingCart}
        delay={0.05}
      />
      <MetricCard
        label={t("avgPerOrder")}
        value={formatIls(metrics.avgPerOrder, true)}
        icon={Receipt}
        delay={0.1}
      />
      <MetricCard
        label={t("vsLastWeek")}
        value={change == null ? "—" : formatPercent(change)}
        icon={isUp ? TrendingUp : isDown ? TrendingDown : Minus}
        delay={0.15}
        footer={
          <p
            className={
              isUp
                ? "mt-1 text-xs text-emerald-500"
                : isDown
                  ? "mt-1 text-xs text-destructive"
                  : "mt-1 text-xs text-muted-foreground"
            }
          >
            {change == null
              ? t("noDataLastWeek")
              : isUp
                ? t("upFromLastWeek")
                : isDown
                  ? t("downFromLastWeek")
                  : t("flatVsLastWeek")}
          </p>
        }
      />
    </div>
  );
}
