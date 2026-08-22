"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatIls } from "@/lib/format";
import type { MonthlyTrendPoint } from "@/lib/queries/finance";

export function MonthlyTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const t = useTranslations("finance");

  const chartConfig: ChartConfig = {
    revenue: { label: t("revenue"), color: "var(--chart-1)" },
    expenses: { label: t("expenses"), color: "var(--chart-2)" },
    profit: { label: t("netProfit"), color: "var(--chart-3)" },
  };

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={64}
          tickFormatter={(value: number) => formatIls(value)}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="revenue"
          name={t("revenue")}
          type="monotone"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={600}
        />
        <Line
          dataKey="expenses"
          name={t("expenses")}
          type="monotone"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={600}
        />
        <Line
          dataKey="profit"
          name={t("netProfit")}
          type="monotone"
          stroke="var(--chart-3)"
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={600}
        />
      </LineChart>
    </ChartContainer>
  );
}
