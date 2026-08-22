"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "Expenses", color: "var(--chart-2)" },
  profit: { label: "Profit", color: "var(--chart-3)" },
};

export function MonthlyTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
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
          name="Revenue"
          type="monotone"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={600}
        />
        <Line
          dataKey="expenses"
          name="Expenses"
          type="monotone"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={600}
        />
        <Line
          dataKey="profit"
          name="Profit"
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
