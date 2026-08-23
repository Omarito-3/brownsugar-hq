"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import type { CoverageGap } from "@/lib/queries/employees";

export function TodayCoverageStrip({ gaps }: { gaps: CoverageGap[] }) {
  const t = useTranslations("employees.dashboardCoverage");

  if (gaps.length === 0) return null;

  return (
    <FadeIn>
      <Card className="border-amber-500/40 bg-amber-500/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-500">{t("heading")}</p>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
            <p className="mt-1 text-sm font-medium">{gaps.map((g) => g.branchName).join(", ")}</p>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
