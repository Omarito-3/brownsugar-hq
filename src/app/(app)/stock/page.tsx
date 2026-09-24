import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Boxes, Truck, Warehouse, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { getBranchScope } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { LowStockAlerts } from "@/components/stock/low-stock-alerts";
import { StockLevelsGrid } from "@/components/stock/stock-levels-grid";
import { RecentMovementsTable } from "@/components/stock/recent-movements-table";
import { StockMetricCards } from "@/components/stock/metric-cards";
import { LocationSelector } from "@/components/stock/location-selector";
import {
  getLowStockAlerts,
  getStockLevelsGrid,
  getRecentMovements,
  getStockMetrics,
  getStockLocations,
  getEditableLocationIds,
} from "@/lib/queries/stock";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { location: locationParam } = await searchParams;
  const t = await getTranslations("stock");
  const isOwner = session.user.role === "OWNER";
  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  const locations = await getStockLocations(scopedBranchId);
  const selectedLocation = locations.some((l) => l.id === locationParam) ? locationParam : undefined;

  const [alerts, levelsGrid, movements, metrics, editableLocationIds] = await Promise.all([
    getLowStockAlerts(scopedBranchId, selectedLocation),
    getStockLevelsGrid(scopedBranchId, selectedLocation),
    getRecentMovements(scopedBranchId, selectedLocation, 15),
    getStockMetrics(scopedBranchId, selectedLocation),
    getEditableLocationIds(session.user.role, scopedBranchId),
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
            <Link href="/stock/requests">
              <ClipboardList className="size-4" />
              {t("requests")}
            </Link>
          </Button>
          {isOwner && (
            <Button asChild variant="outline" className="h-12 text-base">
              <Link href="/stock/locations">
                <Warehouse className="size-4" />
                {t("locations")}
              </Link>
            </Button>
          )}
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

      <FadeIn delay={0.02}>
        <LocationSelector locations={locations} selected={selectedLocation} />
      </FadeIn>

      <LowStockAlerts alerts={alerts} showLocation />

      <StockMetricCards metrics={metrics} />

      <StockLevelsGrid data={levelsGrid} editableLocationIds={editableLocationIds} />

      <RecentMovementsTable movements={movements} />
    </div>
  );
}
