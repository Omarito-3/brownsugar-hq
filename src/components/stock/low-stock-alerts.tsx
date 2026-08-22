"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { useLocale } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { unitLabel } from "@/lib/stock-labels";
import { localizedName } from "@/lib/format";
import type { getLowStockAlerts } from "@/lib/queries/stock";

type LowStockAlerts = Awaited<ReturnType<typeof getLowStockAlerts>>;

export function LowStockAlerts({
  alerts,
  showBranch = true,
}: {
  alerts: LowStockAlerts;
  showBranch?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <FadeIn>
        <h2 className="flex items-center gap-2 text-lg font-medium text-amber-500">
          <AlertTriangle className="size-5" />
          {t("lowStock.heading")}
        </h2>
      </FadeIn>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert, i) => (
          <FadeIn key={`${alert.branchId}-${alert.stockItemId}`} delay={0.03 * i}>
            <Card className="border-amber-500/40 bg-amber-500/10">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{localizedName(alert.itemName, alert.itemNameAr, locale)}</p>
                  {showBranch && <p className="text-sm text-muted-foreground">{alert.branchName}</p>}
                </div>
                <div className="text-end">
                  <p className="text-lg font-semibold text-amber-500">
                    {alert.currentQuantity} {unitLabel(t, alert.unit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("lowStock.below", { threshold: `${alert.threshold} ${unitLabel(t, alert.unit)}` })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
