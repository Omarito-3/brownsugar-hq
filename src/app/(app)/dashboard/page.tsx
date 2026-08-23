import { redirect } from "next/navigation";
import { Receipt, TrendingUp, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { MetricCard } from "@/components/shared/metric-card";
import { BranchTodayCards } from "@/components/sales/branch-today-cards";
import { LowStockAlerts } from "@/components/stock/low-stock-alerts";
import { TodayCoverageStrip } from "@/components/employees/today-coverage-strip";
import { ExpiringDocumentsStrip } from "@/components/management/expiring-documents-strip";
import { HighPriorityTasksStrip } from "@/components/management/high-priority-tasks-strip";
import { RevenueLineChart } from "@/components/charts/revenue-line-chart";
import { formatIls } from "@/lib/format";
import { getWeeklyMetrics, getDailyRevenueSeries, getTodayPerBranch } from "@/lib/queries/sales";
import { getFinanceMetrics } from "@/lib/queries/finance";
import { getLowStockAlerts } from "@/lib/queries/stock";
import { getTodayCoverageGaps } from "@/lib/queries/employees";
import { getExpiringDocuments, getOpenHighPriorityTaskCount } from "@/lib/queries/management";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("dashboard");
  const isOwner = session.user.role === "OWNER";
  const isStaff = session.user.role === "STAFF";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [
    weeklyMetrics,
    financeMetrics,
    { series, branches },
    todayPerBranch,
    lowStockAlerts,
    coverageGaps,
    expiringDocuments,
    highPriorityTaskCount,
  ] = await Promise.all([
    getWeeklyMetrics(scopedBranchId),
    getFinanceMetrics(scopedBranchId),
    getDailyRevenueSeries(scopedBranchId, 30),
    getTodayPerBranch(scopedBranchId),
    getLowStockAlerts(scopedBranchId),
    getTodayCoverageGaps(scopedBranchId),
    isStaff ? Promise.resolve([]) : getExpiringDocuments(scopedBranchId),
    getOpenHighPriorityTaskCount(scopedBranchId, isStaff ? session.user.id : undefined),
  ]);

  const isProfit = financeMetrics.netProfit >= 0;

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <TodayCoverageStrip gaps={coverageGaps} />

      <HighPriorityTasksStrip count={highPriorityTaskCount} />

      <ExpiringDocumentsStrip documents={expiringDocuments} />

      <LowStockAlerts alerts={lowStockAlerts} showBranch={isOwner} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label={t("netProfitThisMonth")}
          value={formatIls(financeMetrics.netProfit)}
          icon={TrendingUp}
          delay={0}
          valueClassName={isProfit ? "text-emerald-500" : "text-destructive"}
        />
        <MetricCard
          label={t("weekRevenue")}
          value={formatIls(weeklyMetrics.totalRevenue)}
          icon={Wallet}
          delay={0.05}
        />
        <MetricCard
          label={t("expensesThisMonth")}
          value={formatIls(financeMetrics.totalExpenses)}
          icon={Receipt}
          delay={0.1}
        />
      </div>

      <div className="space-y-3">
        <FadeIn delay={0.15}>
          <h2 className="text-lg font-medium">{t("todayByBranch")}</h2>
        </FadeIn>
        <BranchTodayCards data={todayPerBranch} />
      </div>

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle>{t("dailyRevenue30")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueLineChart data={series} branches={branches} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
