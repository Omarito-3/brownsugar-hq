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
import { assignBranchColors } from "@/lib/branch-colors";
import { formatIls } from "@/lib/format";
import type { DailyRevenuePoint } from "@/lib/queries/sales";

export function RevenueLineChart({
  data,
  branches,
}: {
  data: DailyRevenuePoint[];
  branches: { id: string; name: string }[];
}) {
  const colors = assignBranchColors(branches);

  const config: ChartConfig = Object.fromEntries(
    branches.map((b) => [b.id, { label: b.name, color: colors.get(b.id) }])
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={64}
          tickFormatter={(value: number) => formatIls(value)}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <ChartLegend content={<ChartLegendContent />} />
        {branches.map((branch) => (
          <Line
            key={branch.id}
            dataKey={branch.id}
            name={branch.name}
            type="monotone"
            stroke={colors.get(branch.id)}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={600}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
