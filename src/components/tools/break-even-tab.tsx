"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { loadBreakEvenData } from "@/lib/actions/tools";
import { formatIls, formatNumber, toDateKey } from "@/lib/format";
import type { BreakEvenSnapshot } from "@/lib/queries/tools";
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

type BranchOption = { id: string; name: string };

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function BreakEvenTab({ branches }: { branches: BranchOption[] }) {
  const t = useTranslations("tools.breakEven");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [month, setMonth] = useState(toDateKey(new Date()).slice(0, 7));
  const [aov, setAov] = useState("25");
  const [snapshot, setSnapshot] = useState<BreakEvenSnapshot | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!branchId || !/^\d{4}-\d{2}$/.test(month)) return;
    startTransition(async () => {
      const result = await loadBreakEvenData(branchId, month);
      setSnapshot(result.ok ? result.data : null);
    });
  }, [branchId, month]);

  const aovValue = num(aov);
  const fixed = snapshot?.fixedCostsIls ?? 0;

  // Orders needed treats AOV as contribution per order; with no fixed costs
  // recorded there's nothing to cover, so the target is zero rather than NaN.
  const ordersNeeded = aovValue > 0 ? Math.ceil(fixed / aovValue) : null;
  const perDayNeeded =
    ordersNeeded != null && snapshot ? ordersNeeded / snapshot.daysInMonth : null;
  const actualPerDay = snapshot ? snapshot.actualOrders / snapshot.daysElapsed : null;

  const gap =
    perDayNeeded != null && actualPerDay != null ? perDayNeeded - actualPerDay : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("branch")}</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-12 w-full text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-base">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="be-month">{t("month")}</Label>
          <Input
            id="be-month"
            type="month"
            className="h-12 text-base"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{t("fixedCosts")}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {isPending ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                ) : (
                  formatIls(fixed)
                )}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("fixedCostsHint")}</p>
          {!isPending && snapshot && fixed === 0 && (
            <p className="mt-2 text-sm text-amber-500">{t("noFixedCosts")}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="be-aov">{t("avgOrderValue")}</Label>
        <Input
          id="be-aov"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          className="h-12 text-base"
          value={aov}
          onChange={(e) => setAov(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("ordersNeeded")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {ordersNeeded == null ? "—" : formatNumber(ordersNeeded)}
            </p>
            {snapshot && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("daysInMonth", { days: snapshot.daysInMonth })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("ordersPerDay")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">
              {perDayNeeded == null ? "—" : perDayNeeded.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("currentOrders")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {snapshot ? formatNumber(snapshot.actualOrders) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("currentPerDay")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {actualPerDay == null ? "—" : actualPerDay.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {gap != null && (
        <div
          className={`rounded-lg px-4 py-3 ${gap <= 0 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}
        >
          <p className={`font-medium ${gap <= 0 ? "text-emerald-500" : "text-amber-500"}`}>
            {gap <= 0 ? t("onTrack") : t("behind", { gap: gap.toFixed(1) })}
          </p>
        </div>
      )}
    </div>
  );
}
