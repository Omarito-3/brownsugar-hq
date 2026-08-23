"use client";

import Link from "next/link";
import { ListTodo } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

export function HighPriorityTasksStrip({ count }: { count: number }) {
  const t = useTranslations("management.dashboardTasks");

  if (count <= 0) return null;

  return (
    <FadeIn>
      <Link href="/management">
        <Card className="border-destructive/40 bg-destructive/10 transition-colors hover:bg-destructive/15">
          <CardContent className="flex items-center gap-3 p-4">
            <ListTodo className="size-5 shrink-0 text-destructive" />
            <p className="font-medium text-destructive">{t("heading", { count })}</p>
          </CardContent>
        </Card>
      </Link>
    </FadeIn>
  );
}
