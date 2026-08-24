"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateCurrencyRate,
  setCurrencyAutoUpdated,
  refreshRatesNow,
} from "@/lib/actions/currencies";
import { formatDate } from "@/lib/format";

type Currency = {
  code: string;
  rateToIls: number;
  updatedAt: Date;
  isAutoUpdated: boolean;
  lastFetchedAt: Date | null;
  isBase: boolean;
};

function CurrencyRow({ currency }: { currency: Currency }) {
  const t = useTranslations("settings.currenciesPage");
  const locale = useLocale();
  const router = useRouter();
  const [rate, setRate] = useState(String(currency.rateToIls));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateCurrencyRate({ code: currency.code, rateToIls: Number(rate) });
      if (result.ok) {
        toast.success(t("rateUpdated", { code: currency.code }));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleAuto(checked: boolean) {
    startTransition(async () => {
      const result = await setCurrencyAutoUpdated(currency.code, checked);
      if (result.ok) {
        toast.success(checked ? t("autoOn", { code: currency.code }) : t("autoOff", { code: currency.code }));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const changed = rate !== String(currency.rateToIls);

  if (currency.isBase) {
    return (
      <TableRow className="text-muted-foreground">
        <TableCell className="font-medium">{currency.code}</TableCell>
        <TableCell className="tabular-nums">{currency.rateToIls}</TableCell>
        <TableCell>
          <Badge variant="outline">{t("baseCurrency")}</Badge>
        </TableCell>
        <TableCell>—</TableCell>
        <TableCell />
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{currency.code}</TableCell>
      <TableCell>
        <Input
          type="number"
          inputMode="decimal"
          step="0.0001"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="h-10 w-32"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={currency.isAutoUpdated}
            onCheckedChange={handleToggleAuto}
            disabled={isPending}
            aria-label={t("autoToggleAria", { code: currency.code })}
          />
          <Badge variant={currency.isAutoUpdated ? "secondary" : "outline"}>
            {currency.isAutoUpdated ? t("sourceAuto") : t("sourceManual")}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {currency.isAutoUpdated
          ? currency.lastFetchedAt
            ? formatDate(currency.lastFetchedAt, locale)
            : t("never")
          : formatDate(currency.updatedAt, locale)}
      </TableCell>
      <TableCell className="text-end">
        <Button size="sm" onClick={handleSave} disabled={!changed || isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {t("save")}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CurrenciesTable({
  currencies,
  hasStaleRates,
  staleDays,
}: {
  currencies: Currency[];
  hasStaleRates: boolean;
  staleDays: number;
}) {
  const t = useTranslations("settings.currenciesPage");
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  function handleRefresh() {
    startRefresh(async () => {
      const result = await refreshRatesNow();
      if (result.ok) {
        toast.success(t("refreshed", { count: result.updated }));
        router.refresh();
      } else {
        toast.error(t("refreshFailed"));
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("cardTitle")}</CardTitle>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {isRefreshing ? t("refreshing") : t("refreshNow")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasStaleRates && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-500">{t("staleWarning", { days: staleDays })}</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{t("rateNote")}</p>
        <p className="text-xs text-muted-foreground">{t("providerNote")}</p>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnCurrency")}</TableHead>
                <TableHead>{t("columnRate")}</TableHead>
                <TableHead>{t("columnSource")}</TableHead>
                <TableHead>{t("columnLastFetched")}</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((c) => (
                <CurrencyRow key={c.code} currency={c} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
