import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { UNIT_LABELS } from "@/lib/stock-labels";
import type { getLowStockAlerts } from "@/lib/queries/stock";

type LowStockAlerts = Awaited<ReturnType<typeof getLowStockAlerts>>;

export function LowStockAlerts({
  alerts,
  showBranch = true,
}: {
  alerts: LowStockAlerts;
  showBranch?: boolean;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <FadeIn>
        <h2 className="flex items-center gap-2 text-lg font-medium text-amber-500">
          <AlertTriangle className="size-5" />
          Low Stock Alerts
        </h2>
      </FadeIn>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert, i) => (
          <FadeIn key={`${alert.branchId}-${alert.stockItemId}`} delay={0.03 * i}>
            <Card className="border-amber-500/40 bg-amber-500/10">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{alert.itemName}</p>
                  {showBranch && <p className="text-sm text-muted-foreground">{alert.branchName}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-amber-500">
                    {alert.currentQuantity} {UNIT_LABELS[alert.unit] ?? alert.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    below {alert.threshold} {UNIT_LABELS[alert.unit] ?? alert.unit}
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
