"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateCurrencyRate } from "@/lib/actions/currencies";
import { formatDate } from "@/lib/format";

type Currency = { code: string; rateToIls: number; updatedAt: Date };

function CurrencyRow({ currency }: { currency: Currency }) {
  const t = useTranslations("settings.currenciesPage");
  const locale = useLocale();
  const [rate, setRate] = useState(String(currency.rateToIls));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateCurrencyRate({ code: currency.code, rateToIls: Number(rate) });
      if (result.ok) {
        toast.success(t("rateUpdated", { code: currency.code }));
      } else {
        toast.error(result.error);
      }
    });
  }

  const changed = rate !== String(currency.rateToIls);

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
      <TableCell className="text-muted-foreground">{formatDate(currency.updatedAt, locale)}</TableCell>
      <TableCell className="text-end">
        <Button size="sm" onClick={handleSave} disabled={!changed || isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {t("save")}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CurrenciesTable({ currencies }: { currencies: Currency[] }) {
  const t = useTranslations("settings.currenciesPage");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("cardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("rateNote")}</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnCurrency")}</TableHead>
                <TableHead>{t("columnRate")}</TableHead>
                <TableHead>{t("columnLastUpdated")}</TableHead>
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
