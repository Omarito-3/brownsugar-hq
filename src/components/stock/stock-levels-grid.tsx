"use client";

import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";
import { unitLabel } from "@/lib/stock-labels";
import { localizedName } from "@/lib/format";
import type { getStockLevelsGrid } from "@/lib/queries/stock";

type StockLevelsGrid = Awaited<ReturnType<typeof getStockLevelsGrid>>;

export function StockLevelsGrid({ data }: { data: StockLevelsGrid }) {
  const { items, branches, quantities } = data;
  const t = useTranslations();
  const locale = useLocale();

  return (
    <FadeIn delay={0.1}>
      <Card>
        <CardHeader>
          <CardTitle>{t("stock.stockLevels")}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("stock.noItemsConfigured")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("stock.columnItem")}</TableHead>
                    {branches.map((b) => (
                      <TableHead key={b.id} className="text-end">
                        {b.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {localizedName(item.name, item.nameAr, locale)}
                      </TableCell>
                      {branches.map((branch) => {
                        const qty = quantities[branch.id]?.[item.id] ?? 0;
                        const isOut = qty <= 0;
                        const isLow = qty > 0 && qty < item.threshold;
                        return (
                          <TableCell
                            key={branch.id}
                            className={cn(
                              "text-end tabular-nums",
                              isOut && "font-medium text-destructive",
                              isLow && "font-medium text-amber-500"
                            )}
                          >
                            {qty} {unitLabel(t, item.unit)}
                          </TableCell>
                        );
                      })}
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
