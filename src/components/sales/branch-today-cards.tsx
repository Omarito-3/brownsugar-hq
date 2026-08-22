"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { formatIls, formatNumber } from "@/lib/format";
import type { getTodayPerBranch } from "@/lib/queries/sales";

type TodayPerBranch = Awaited<ReturnType<typeof getTodayPerBranch>>;

export function BranchTodayCards({ data }: { data: TodayPerBranch }) {
  const t = useTranslations("branchToday");
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((branch, i) => (
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
            <CardContent>
              {branch.hasEntry ? (
                <>
                  <div className="text-3xl font-semibold tracking-tight">
                    {formatIls(branch.totalIls)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("ordersToday", { count: formatNumber(branch.orderCount) })}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-semibold tracking-tight text-muted-foreground">—</div>
                  <Link
                    href="/sales/new"
                    className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    {t("noEntryYet")}
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}
