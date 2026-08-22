import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { MetricCard } from "@/components/sales/metric-cards";
import { BranchTodayCards } from "@/components/sales/branch-today-cards";
import { RevenueLineChart } from "@/components/charts/revenue-line-chart";
import { formatIls } from "@/lib/format";
import { getWeeklyMetrics, getDailyRevenueSeries, getTodayPerBranch } from "@/lib/queries/sales";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isOwner = session.user.role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [metrics, { series, branches }, todayPerBranch] = await Promise.all([
    getWeeklyMetrics(scopedBranchId),
    getDailyRevenueSeries(scopedBranchId, 30),
    getTodayPerBranch(scopedBranchId),
  ]);

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">A daily overview across all branches.</p>
      </FadeIn>

      <div className="max-w-sm">
        <MetricCard
          label="This Week's Revenue"
          value={formatIls(metrics.totalRevenue)}
          icon={Wallet}
          delay={0}
        />
      </div>

      <div className="space-y-3">
        <FadeIn delay={0.05}>
          <h2 className="text-lg font-medium">Today by Branch</h2>
        </FadeIn>
        <BranchTodayCards data={todayPerBranch} />
      </div>

      <FadeIn delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueLineChart data={series} branches={branches} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
