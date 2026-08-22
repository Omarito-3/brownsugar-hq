"use client";

import { Cell, Pie, PieChart } from "recharts";
import { useTranslations } from "next-intl";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { assignColorsForKeys } from "@/lib/branch-colors";
import type { CategoryBreakdownPoint } from "@/lib/queries/finance";

const CATEGORY_KEYS = ["RENT", "SUPPLIES", "SALARY", "MARKETING", "EQUIPMENT", "OTHER"] as const;

export function ExpenseCategoryDonut({ data }: { data: CategoryBreakdownPoint[] }) {
  const t = useTranslations("finance");
  const colors = assignColorsForKeys(data.map((d) => d.category));

  function categoryLabel(category: string): string {
    return (CATEGORY_KEYS as readonly string[]).includes(category)
      ? t(`categories.${category}` as (typeof CATEGORY_KEYS)[number])
      : category;
  }

  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.category, { label: categoryLabel(d.category), color: colors.get(d.category) }])
  );

  if (data.length === 0) {
    return (
      <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        {t("noExpensesThisMonth")}
      </p>
    );
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent indicator="dot" hideLabel nameKey="category" />} />
        <Pie
          data={data}
          dataKey="amountIls"
          nameKey="category"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          isAnimationActive
          animationDuration={600}
        >
          {data.map((d) => (
            <Cell key={d.category} fill={colors.get(d.category)} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="category" />} />
      </PieChart>
    </ChartContainer>
  );
}
