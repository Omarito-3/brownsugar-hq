"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { MarginTab } from "@/components/tools/margin-tab";
import { BreakEvenTab } from "@/components/tools/break-even-tab";
import { PriceSetterTab } from "@/components/tools/price-setter-tab";
import { QuickCalcTab } from "@/components/tools/quick-calc-tab";
import type { CalculatorProduct } from "@/lib/queries/tools";

type BranchOption = { id: string; name: string };
type CurrencyOption = { code: string; rateToIls: number };

export function CalculatorTabs({
  products,
  branches,
  currencies,
}: {
  products: CalculatorProduct[];
  branches: BranchOption[];
  currencies: CurrencyOption[];
}) {
  const t = useTranslations("tools.tabs");

  return (
    <Tabs defaultValue="margin" className="w-full">
      {/* Scrolls rather than wrapping so all four stay reachable on a phone. */}
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="margin">{t("margin")}</TabsTrigger>
        <TabsTrigger value="breakEven">{t("breakEven")}</TabsTrigger>
        <TabsTrigger value="priceSetter">{t("priceSetter")}</TabsTrigger>
        <TabsTrigger value="quick">{t("quick")}</TabsTrigger>
      </TabsList>

      <Card className="mt-4">
        <CardContent className="p-4 sm:p-6">
          <TabsContent value="margin" className="mt-0">
            <MarginTab products={products} />
          </TabsContent>
          <TabsContent value="breakEven" className="mt-0">
            <BreakEvenTab branches={branches} />
          </TabsContent>
          <TabsContent value="priceSetter" className="mt-0">
            <PriceSetterTab />
          </TabsContent>
          <TabsContent value="quick" className="mt-0">
            <QuickCalcTab currencies={currencies} />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
