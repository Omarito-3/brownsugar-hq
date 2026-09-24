"use client";

import { Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

/**
 * Shown in place of a branch-scoped page when a MANAGER/STAFF account has no
 * branch assigned. The page renders this *instead of* loading any data.
 */
export function NoBranchAssigned() {
  const t = useTranslations("noBranch");

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="size-6" />
            </span>
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("description")}</p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
