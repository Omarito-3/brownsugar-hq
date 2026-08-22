import { AlertOctagon, ShoppingBag } from "lucide-react";

import { MetricCard } from "@/components/shared/metric-card";
import { formatIls, formatNumber } from "@/lib/format";
import type { getStockMetrics } from "@/lib/queries/stock";

type StockMetrics = Awaited<ReturnType<typeof getStockMetrics>>;

export function StockMetricCards({ metrics }: { metrics: StockMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MetricCard
        label="Purchase Spend This Month"
        value={formatIls(metrics.purchaseSpendThisMonth)}
        icon={ShoppingBag}
        delay={0}
      />
      <MetricCard
        label="Waste Events This Month"
        value={formatNumber(metrics.wasteCountThisMonth)}
        icon={AlertOctagon}
        delay={0.05}
      />
    </div>
  );
}
