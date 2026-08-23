"use client";

import { AlertTriangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { formatDate } from "@/lib/format";
import type { ExpiringDocument } from "@/lib/queries/management";

export function ExpiringDocumentsStrip({ documents }: { documents: ExpiringDocument[] }) {
  const t = useTranslations("management.dashboardDocuments");
  const locale = useLocale();

  if (documents.length === 0) return null;

  return (
    <FadeIn>
      <Card className="border-amber-500/40 bg-amber-500/10">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div className="space-y-1">
            <p className="font-medium text-amber-500">{t("heading")}</p>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {documents.map((doc) => (
                <li key={doc.id}>
                  {doc.title}
                  {doc.branchName ? ` · ${doc.branchName}` : ""} —{" "}
                  {doc.isExpired
                    ? t("expiredLabel", { date: formatDate(doc.expiryDate, locale) })
                    : t("expiringLabel", { date: formatDate(doc.expiryDate, locale) })}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
