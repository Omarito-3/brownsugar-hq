import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { SalesMetricCards } from "@/components/sales/metric-cards";
import { RevenueLineChart } from "@/components/charts/revenue-line-chart";
import { RevenueBarChart } from "@/components/charts/revenue-bar-chart";
import { RecentEntriesTable } from "@/components/sales/recent-entries-table";
import {
  getWeeklyMetrics,
  getDailyRevenueSeries,
  getRevenueByBranchThisMonth,
  getRecentSalesEntries,
} from "@/lib/queries/sales";

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("sales");
  const isOwner = session.user.role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [metrics, { series, branches }, branchRevenue, recentEntries] = await Promise.all([
    getWeeklyMetrics(scopedBranchId),
    getDailyRevenueSeries(scopedBranchId, 30),
    getRevenueByBranchThisMonth(scopedBranchId),
    getRecentSalesEntries(scopedBranchId, 10),
  ]);

  return (
    <div className="space-y-8">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild size="lg" className="h-12 text-base">
          <Link href="/sales/new">
            <Plus className="size-4" />
            {t("newEntry")}
          </Link>
        </Button>
      </FadeIn>

      <SalesMetricCards metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("dailyRevenue30")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueLineChart data={series} branches={branches} />
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle>{t("revenueByBranchMonth")}</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueBarChart data={branchRevenue} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <RecentEntriesTable entries={recentEntries} canManage={isOwner} />
    </div>
  );
}
