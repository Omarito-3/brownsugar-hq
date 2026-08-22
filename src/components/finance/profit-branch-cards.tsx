import { Store } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { formatIls } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { getProfitByBranch } from "@/lib/queries/finance";

type ProfitByBranch = Awaited<ReturnType<typeof getProfitByBranch>>;

export function ProfitBranchCards({ data }: { data: ProfitByBranch }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((branch, i) => {
        const isProfit = branch.net >= 0;
        return (
          <FadeIn key={branch.branchId} delay={0.05 * i}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {branch.branchName}
                </CardTitle>
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Store className="size-5" />
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                <div
                  className={cn(
                    "text-3xl font-semibold tracking-tight",
                    isProfit ? "text-emerald-500" : "text-destructive"
                  )}
                >
                  {formatIls(branch.net)}
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Revenue</span>
                  <span className="tabular-nums text-foreground">{formatIls(branch.revenue)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Expenses</span>
                  <span className="tabular-nums text-foreground">{formatIls(branch.expenses)}</span>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        );
      })}
    </div>
  );
}
