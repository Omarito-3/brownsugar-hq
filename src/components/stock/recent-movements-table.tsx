"use client";

import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FadeIn } from "@/components/motion/fade-in";
import { formatDate, formatIls, localizedName } from "@/lib/format";
import { unitLabel, movementTypeLabel, adjustmentDirectionLabel } from "@/lib/stock-labels";
import type { getRecentMovements } from "@/lib/queries/stock";

type RecentMovements = Awaited<ReturnType<typeof getRecentMovements>>;

export function RecentMovementsTable({ movements }: { movements: RecentMovements }) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <FadeIn delay={0.25}>
      <Card>
        <CardHeader>
          <CardTitle>{t("stock.recentMovements")}</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("stock.noMovementsYet")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("stock.columnDate")}</TableHead>
                    <TableHead>{t("stock.columnBranch")}</TableHead>
                    <TableHead>{t("stock.columnItem")}</TableHead>
                    <TableHead>{t("stock.columnType")}</TableHead>
                    <TableHead className="text-end">{t("stock.columnQuantity")}</TableHead>
                    <TableHead className="text-end">{t("stock.columnCost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(m.date, locale)}
                      </TableCell>
                      <TableCell className="font-medium">{m.branchName}</TableCell>
                      <TableCell>{localizedName(m.itemName, m.itemNameAr, locale)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {movementTypeLabel(t, m.type)}
                          {m.direction ? ` (${adjustmentDirectionLabel(t, m.direction)})` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {m.quantity} {unitLabel(t, m.unit)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {m.costIls != null ? formatIls(m.costIls) : t("common.dash")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
