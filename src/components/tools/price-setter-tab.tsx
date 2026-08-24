"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatIls, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Ingredient = { id: number; name: string; cost: string };

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Round price points bracketing the suggestion, so you can see what rounding costs. */
function roundPointsAround(price: number): number[] {
  if (!Number.isFinite(price) || price <= 0) return [];
  const base = Math.floor(price);
  const points: number[] = [];
  for (let p = base - 2; p <= base + 3; p++) {
    if (p > 0) points.push(p);
  }
  return points;
}

export function PriceSetterTab() {
  const t = useTranslations("tools.priceSetter");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, name: "", cost: "" },
  ]);
  const [nextId, setNextId] = useState(2);
  const [targetMargin, setTargetMargin] = useState("60");

  function update(id: number, patch: Partial<Ingredient>) {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  const totalCost = ingredients.reduce((sum, i) => sum + num(i.cost), 0);
  const marginValue = num(targetMargin);
  const marginValid = marginValue > 0 && marginValue < 100;

  // price = cost / (1 - margin), i.e. margin is taken on the selling price.
  const suggested = marginValid ? totalCost / (1 - marginValue / 100) : null;
  const points = suggested != null ? roundPointsAround(suggested) : [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>{t("ingredients")}</Label>
        {ingredients.map((ingredient) => (
          <div key={ingredient.id} className="flex items-start gap-2">
            <Input
              className="h-11 flex-1 text-base"
              placeholder={t("ingredientName")}
              value={ingredient.name}
              onChange={(e) => update(ingredient.id, { name: e.target.value })}
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="h-11 w-28 text-base"
              placeholder={t("ingredientCost")}
              value={ingredient.cost}
              onChange={(e) => update(ingredient.id, { cost: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11"
              disabled={ingredients.length === 1}
              onClick={() => setIngredients((prev) => prev.filter((i) => i.id !== ingredient.id))}
              aria-label={t("removeAria")}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setIngredients((prev) => [...prev, { id: nextId, name: "", cost: "" }]);
            setNextId((n) => n + 1);
          }}
        >
          <Plus className="size-4" />
          {t("addIngredient")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("totalCost")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatIls(totalCost, true)}
            </p>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <Label htmlFor="ps-margin">{t("targetMargin")}</Label>
          <Input
            id="ps-margin"
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            max="99"
            className="h-12 text-base"
            value={targetMargin}
            onChange={(e) => setTargetMargin(e.target.value)}
          />
          {!marginValid && targetMargin !== "" && (
            <p className="text-sm text-destructive">{t("marginTooHigh")}</p>
          )}
        </div>
      </div>

      {suggested != null && totalCost > 0 && (
        <div className="rounded-lg bg-primary/10 px-4 py-3">
          <p className="text-sm text-muted-foreground">{t("suggestedPrice")}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">
            {formatIls(suggested, true)}
          </p>
        </div>
      )}

      {points.length > 0 && totalCost > 0 && (
        <div className="space-y-2">
          <Label>{t("roundPoints")}</Label>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("priceColumn")}</TableHead>
                  <TableHead className="text-end">{t("profitColumn")}</TableHead>
                  <TableHead className="text-end">{t("marginColumn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {points.map((price) => {
                  const profit = price - totalCost;
                  const margin = (profit / price) * 100;
                  const meetsTarget = marginValid && margin >= marginValue;
                  return (
                    <TableRow key={price}>
                      <TableCell className="font-medium tabular-nums">{formatIls(price)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-end tabular-nums",
                          profit < 0 && "text-destructive"
                        )}
                      >
                        {formatIls(profit, true)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-end tabular-nums font-medium",
                          margin < 0
                            ? "text-destructive"
                            : meetsTarget
                              ? "text-emerald-500"
                              : "text-amber-500"
                        )}
                      >
                        {formatPercent(margin, { showSign: false })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
