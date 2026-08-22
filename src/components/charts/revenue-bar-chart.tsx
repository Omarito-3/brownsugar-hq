"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { assignBranchColors } from "@/lib/branch-colors";
import { formatIls } from "@/lib/format";

export type BranchRevenue = { branchId: string; branchName: string; revenue: number };

export function RevenueBarChart({ data }: { data: BranchRevenue[] }) {
  const colors = assignBranchColors(data.map((d) => ({ id: d.branchId })));

  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.branchId, { label: d.branchName, color: colors.get(d.branchId) }])
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 24 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="branchName"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={50}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={64}
          tickFormatter={(value: number) => formatIls(value)}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
          {data.map((d) => (
            <Cell key={d.branchId} fill={colors.get(d.branchId)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
