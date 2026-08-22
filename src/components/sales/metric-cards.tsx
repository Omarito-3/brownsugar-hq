import type { LucideIcon } from "lucide-react";
import { Wallet, ShoppingCart, Receipt, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { formatIls, formatNumber, formatPercent } from "@/lib/format";
import type { WeeklyMetrics } from "@/lib/queries/sales";

export function MetricCard({
  label,
  value,
  icon: Icon,
  delay,
  footer,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delay: number;
  footer?: React.ReactNode;
}) {
  return (
    <FadeIn delay={delay}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          {footer}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

export function SalesMetricCards({ metrics }: { metrics: WeeklyMetrics }) {
  const change = metrics.wowChangePercent;
  const isUp = change != null && change > 0;
  const isDown = change != null && change < 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="This Week's Revenue"
        value={formatIls(metrics.totalRevenue)}
        icon={Wallet}
        delay={0}
      />
      <MetricCard
        label="Total Orders"
        value={formatNumber(metrics.totalOrders)}
        icon={ShoppingCart}
        delay={0.05}
      />
      <MetricCard
        label="Average per Order"
        value={formatIls(metrics.avgPerOrder, true)}
        icon={Receipt}
        delay={0.1}
      />
      <MetricCard
        label="vs Last Week"
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
            {change == null ? "No data for last week" : isUp ? "Up from last week" : isDown ? "Down from last week" : "Flat vs last week"}
          </p>
        }
      />
    </div>
  );
}
