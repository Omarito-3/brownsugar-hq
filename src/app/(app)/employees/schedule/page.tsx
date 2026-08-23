import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ScheduleGrid } from "@/components/employees/schedule/schedule-grid";
import {
  getWeeklySchedule,
  getActiveEmployeesGrouped,
  weekStartFromKey,
} from "@/lib/queries/employees";
import { toDateKey } from "@/lib/format";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { week } = await searchParams;
  const t = await getTranslations("employees.schedule");
  const tEmployees = await getTranslations("employees");
  const isOwner = session.user.role === "OWNER";
  const canManage = isOwner || session.user.role === "MANAGER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const anchorKey = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : toDateKey(new Date());

  const [days, employeesByBranch] = await Promise.all([
    getWeeklySchedule(anchorKey, scopedBranchId),
    getActiveEmployeesGrouped(scopedBranchId),
  ]);

  const start = weekStartFromKey(anchorKey);
  const prevWeek = new Date(start);
  prevWeek.setUTCDate(prevWeek.getUTCDate() - 7);
  const nextWeek = new Date(start);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);

  return (
    <div className="space-y-6">
      <FadeIn className="space-y-4">
        {canManage && (
          <Link
            href="/employees"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {tEmployees("backToEmployees")}
          </Link>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" aria-label={t("prevWeek")}>
              <Link href={`/employees/schedule?week=${toDateKey(prevWeek)}`}>
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/employees/schedule">{t("thisWeek")}</Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label={t("nextWeek")}>
              <Link href={`/employees/schedule?week=${toDateKey(nextWeek)}`}>
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>

      {!canManage && <p className="text-sm text-muted-foreground">{t("readOnlyNote")}</p>}

      <FadeIn delay={0.05}>
        <ScheduleGrid days={days} employeesByBranch={employeesByBranch} canManage={canManage} />
      </FadeIn>
    </div>
  );
}
