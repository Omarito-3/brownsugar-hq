import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { FinanceMetricCards } from "@/components/finance/metric-cards";
import { ProfitBranchCards } from "@/components/finance/profit-branch-cards";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { ExpenseCategoryDonut } from "@/components/charts/expense-category-donut";
import { RecentExpensesTable } from "@/components/finance/recent-expenses-table";
import {
  getFinanceMetrics,
  getProfitByBranch,
  getMonthlyTrend,
  getExpenseCategoryBreakdown,
  getRecentExpenses,
} from "@/lib/queries/finance";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isOwner = session.user.role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [metrics, profitByBranch, monthlyTrend, categoryBreakdown, recentExpenses] = await Promise.all([
    getFinanceMetrics(scopedBranchId),
    getProfitByBranch(scopedBranchId),
    getMonthlyTrend(scopedBranchId, 6),
    getExpenseCategoryBreakdown(scopedBranchId),
    getRecentExpenses(scopedBranchId, 10),
  ]);

  return (
    <div className="space-y-8">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
          <p className="mt-1 text-muted-foreground">Expenses, profit, and margins across branches.</p>
        </div>
        <Button asChild size="lg" className="h-12 text-base">
          <Link href="/finance/new">
            <Plus className="size-4" />
            New expense
          </Link>
        </Button>
      </FadeIn>

      <FinanceMetricCards metrics={metrics} />

      <div className="space-y-3">
        <FadeIn delay={0.05}>
          <h2 className="text-lg font-medium">Profit by Branch — This Month</h2>
        </FadeIn>
        <ProfitBranchCards data={profitByBranch} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn delay={0.1} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyTrendChart data={monthlyTrend} />
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category — This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseCategoryDonut data={categoryBreakdown} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <RecentExpensesTable expenses={recentExpenses} isOwner={isOwner} />
    </div>
  );
}
