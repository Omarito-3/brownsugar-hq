"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [rate, setRate] = useState(String(currency.rateToIls));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateCurrencyRate({ code: currency.code, rateToIls: Number(rate) });
      if (result.ok) {
        toast.success(`${currency.code} rate updated.`);
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
      <TableCell className="text-muted-foreground">{formatDate(currency.updatedAt)}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" onClick={handleSave} disabled={!changed || isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CurrenciesTable({ currencies }: { currencies: Currency[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Rates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Rate changes only apply to new sales and expense entries going forward — existing
          entries keep the rate that was in effect when they were saved.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Rate to ILS</TableHead>
                <TableHead>Last Updated</TableHead>
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
