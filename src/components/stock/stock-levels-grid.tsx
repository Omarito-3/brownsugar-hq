"use client";

import { Warehouse, Store } from "lucide-react";
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
import { MinimumEditorDialog } from "@/components/stock/minimum-editor-dialog";
import type { getStockLevelsGrid } from "@/lib/queries/stock";

type StockLevelsGrid = Awaited<ReturnType<typeof getStockLevelsGrid>>;

export function StockLevelsGrid({
  data,
  editableLocationIds = [],
}: {
  data: StockLevelsGrid;
  editableLocationIds?: string[];
}) {
  const { items, locations, quantities, minimums } = data;
  const t = useTranslations();
  const locale = useLocale();
  const editable = new Set(editableLocationIds);

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
                    {locations.map((l) => {
                      const Icon = l.type === "WAREHOUSE" ? Warehouse : Store;
                      return (
                        <TableHead key={l.id} className="text-end">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                            {localizedName(l.name, l.nameAr, locale)}
                          </span>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const itemName = localizedName(item.name, item.nameAr, locale);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{itemName}</TableCell>
                        {locations.map((location) => {
                          const qty = quantities[location.id]?.[item.id] ?? 0;
                          const min = minimums[location.id]?.[item.id] ?? 0;
                          // Per-location minimum wins when set; otherwise the item default.
                          const isOverride = min > 0;
                          const threshold = isOverride ? min : item.threshold;
                          const isOut = qty <= 0;
                          const isLow = qty > 0 && qty < threshold;
                          const canEdit = editable.has(location.id);
                          const locationName = localizedName(location.name, location.nameAr, locale);
                          const u = unitLabel(t, item.unit);

                          const body = (
                            <>
                              <span
                                className={cn(
                                  "block tabular-nums",
                                  isOut && "font-medium text-destructive",
                                  isLow && "font-medium text-amber-500"
                                )}
                              >
                                {qty} {u}
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 block text-xs tabular-nums",
                                  isOverride ? "text-primary" : "text-muted-foreground"
                                )}
                              >
                                {isOverride
                                  ? t("stock.minimumEditor.cellMin", { value: `${threshold} ${u}` })
                                  : t("stock.minimumEditor.cellMinDefault", {
                                      value: `${threshold} ${u}`,
                                    })}
                              </span>
                            </>
                          );

                          return (
                            <TableCell key={location.id} className="p-1 text-end align-top">
                              {canEdit ? (
                                <MinimumEditorDialog
                                  locationId={location.id}
                                  locationName={locationName}
                                  itemId={item.id}
                                  itemName={itemName}
                                  unit={item.unit}
                                  currentQuantity={qty}
                                  minimum={min}
                                  itemDefault={item.threshold}
                                  trigger={
                                    <button
                                      type="button"
                                      className="w-full rounded-md px-2 py-1.5 text-end transition-colors hover:bg-accent"
                                      aria-label={t("stock.minimumEditor.editAria", {
                                        item: itemName,
                                        location: locationName,
                                      })}
                                    >
                                      {body}
                                    </button>
                                  }
                                />
                              ) : (
                                <div className="px-2 py-1.5">{body}</div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
