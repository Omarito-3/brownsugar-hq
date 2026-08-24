"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

export function PendingRequestsStrip({ count }: { count: number }) {
  const t = useTranslations("stock.dashboardRequests");

  if (count <= 0) return null;

  return (
    <FadeIn>
      <Link href="/stock/requests">
        <Card className="border-primary/40 bg-primary/10 transition-colors hover:bg-primary/15">
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="size-5 shrink-0 text-primary" />
            <p className="font-medium text-primary">{t("heading", { count })}</p>
          </CardContent>
        </Card>
      </Link>
    </FadeIn>
  );
}
