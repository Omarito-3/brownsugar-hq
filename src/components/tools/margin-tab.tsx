"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { formatIls, formatPercent, localizedName } from "@/lib/format";
import type { CalculatorProduct } from "@/lib/queries/tools";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function MarginTab({ products }: { products: CalculatorProduct[] }) {
  const t = useTranslations("tools.margin");
  const locale = useLocale();
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [target, setTarget] = useState("1000");

  function onPickProduct(id: string) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (!product) return;
    // Prefill from the DB, but everything stays editable for what-ifs.
    setPrice(String(product.basePriceIls));
    setCost(product.costIls != null ? String(product.costIls) : "");
  }

  const priceValue = num(price);
  const costValue = num(cost);
  const profit = priceValue - costValue;
  const margin = priceValue > 0 ? (profit / priceValue) * 100 : null;
  const targetValue = num(target);
  const unitsNeeded = profit > 0 ? Math.ceil(targetValue / profit) : null;

  const selected = products.find((p) => p.id === productId);
  const showNoCostHint = !!selected && selected.costIls == null && !cost;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t("selectProduct")}</Label>
        <Select value={productId} onValueChange={onPickProduct}>
          <SelectTrigger className="h-12 w-full text-base">
            <SelectValue placeholder={t("selectProductPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-base">
                {localizedName(p.name, p.nameAr, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="margin-price">{t("price")}</Label>
          <Input
            id="margin-price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="h-12 text-base"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="margin-cost">{t("cost")}</Label>
          <Input
            id="margin-cost"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="h-12 text-base"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </div>

      {showNoCostHint && <p className="text-sm text-muted-foreground">{t("noCost")}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("profitPerUnit")}</p>
            <p
              className={`mt-1 text-3xl font-semibold tracking-tight ${profit < 0 ? "text-destructive" : "text-emerald-500"}`}
            >
              {formatIls(profit, true)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("marginPercent")}</p>
            <p
              className={`mt-1 text-3xl font-semibold tracking-tight ${margin != null && margin < 0 ? "text-destructive" : ""}`}
            >
              {margin == null ? "—" : formatPercent(margin, { showSign: false })}
            </p>
          </CardContent>
        </Card>
      </div>

      {profit < 0 && priceValue > 0 && (
        <p className="text-sm font-medium text-destructive">{t("negativeMargin")}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="margin-target">{t("targetEarnings")}</Label>
        <Input
          id="margin-target"
          type="number"
          inputMode="decimal"
          step="1"
          min="0"
          className="h-12 text-base"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </div>

      {unitsNeeded != null && targetValue > 0 && (
        <div className="rounded-lg bg-primary/10 px-4 py-3">
          <p className="font-medium text-primary">
            {t("sellN", { units: unitsNeeded, amount: formatIls(targetValue) })}
          </p>
        </div>
      )}
    </div>
  );
}
