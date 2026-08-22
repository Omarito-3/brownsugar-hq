import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Boxes, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { LowStockAlerts } from "@/components/stock/low-stock-alerts";
import { StockLevelsGrid } from "@/components/stock/stock-levels-grid";
import { RecentMovementsTable } from "@/components/stock/recent-movements-table";
import { StockMetricCards } from "@/components/stock/metric-cards";
import {
  getLowStockAlerts,
  getStockLevelsGrid,
  getRecentMovements,
  getStockMetrics,
} from "@/lib/queries/stock";

export default async function StockPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("stock");
  const isOwner = session.user.role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [alerts, levelsGrid, movements, metrics] = await Promise.all([
    getLowStockAlerts(scopedBranchId),
    getStockLevelsGrid(scopedBranchId),
    getRecentMovements(scopedBranchId, 15),
    getStockMetrics(scopedBranchId),
  ]);

  return (
    <div className="space-y-8">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-12 text-base">
            <Link href="/stock/suppliers">
              <Truck className="size-4" />
              {t("suppliers")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 text-base">
            <Link href="/stock/items">
              <Boxes className="size-4" />
              {t("items")}
            </Link>
          </Button>
          <Button asChild size="lg" className="h-12 text-base">
            <Link href="/stock/movement">
              <Plus className="size-4" />
              {t("recordMovement")}
            </Link>
          </Button>
        </div>
      </FadeIn>

      <LowStockAlerts alerts={alerts} showBranch={isOwner} />

      <StockMetricCards metrics={metrics} />

      <StockLevelsGrid data={levelsGrid} />

      <RecentMovementsTable movements={movements} />
    </div>
  );
}
