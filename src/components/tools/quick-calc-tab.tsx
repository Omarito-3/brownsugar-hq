"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { safeEvaluate } from "@/lib/safe-eval";
import { formatNumber } from "@/lib/format";
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

type CurrencyOption = { code: string; rateToIls: number };

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function QuickCalcTab({ currencies }: { currencies: CurrencyOption[] }) {
  const t = useTranslations("tools.quick");
  const [expression, setExpression] = useState("");
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(currencies[0]?.code ?? "ILS");
  const [to, setTo] = useState(currencies.find((c) => c.code !== from)?.code ?? "ILS");

  const result = safeEvaluate(expression);
  const showError = expression.trim() !== "" && result === null;

  const rateFrom = currencies.find((c) => c.code === from)?.rateToIls ?? 0;
  const rateTo = currencies.find((c) => c.code === to)?.rateToIls ?? 0;
  // Convert via ILS: amount -> ILS -> target.
  const converted = rateTo > 0 ? (num(amount) * rateFrom) / rateTo : null;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Label htmlFor="qc-expression">{t("expression")}</Label>
        <Input
          id="qc-expression"
          className="h-12 font-mono text-base"
          placeholder={t("expressionPlaceholder")}
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          inputMode="text"
          autoComplete="off"
        />
        {showError ? (
          <p className="text-sm text-destructive">{t("invalidExpression")}</p>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t("result")}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {result === null ? "—" : formatNumber(Number(result.toFixed(4)))}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <Label>{t("conversion")}</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="qc-amount" className="text-xs text-muted-foreground">
              {t("amount")}
            </Label>
            <Input
              id="qc-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              className="h-12 text-base"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="h-11 w-full text-base" aria-label={t("from")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-base">
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden justify-center pb-3 sm:flex">
            <ArrowRight className="size-5 text-muted-foreground rtl:rotate-180" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t("converted")}</Label>
            <div className="flex h-12 items-center rounded-md border border-input bg-muted px-3 text-base font-semibold tabular-nums">
              {converted == null ? "—" : converted.toFixed(2)}
            </div>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="h-11 w-full text-base" aria-label={t("to")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-base">
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("rateNote")}</p>
      </div>
    </div>
  );
}
