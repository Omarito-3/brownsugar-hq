import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  delay,
  footer,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delay: number;
  footer?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <FadeIn delay={delay}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        </CardHeader>
        <CardContent>
          <div className={cn("text-3xl font-semibold tracking-tight", valueClassName)}>{value}</div>
          {footer}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
