"use client";

import { Cell, Pie, PieChart } from "recharts";

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

const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Rent",
  SUPPLIES: "Supplies",
  SALARY: "Salary",
  MARKETING: "Marketing",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export function ExpenseCategoryDonut({ data }: { data: CategoryBreakdownPoint[] }) {
  const colors = assignColorsForKeys(data.map((d) => d.category));

  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [
      d.category,
      { label: CATEGORY_LABELS[d.category] ?? d.category, color: colors.get(d.category) },
    ])
  );

  if (data.length === 0) {
    return (
      <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No expenses recorded this month.
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
