"use client";

import { AlertTriangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { shiftLabel } from "@/lib/employee-labels";
import { formatDate } from "@/lib/format";
import type { ScheduleDay, ScheduleShiftGroups } from "@/lib/queries/employees";
import { DayScheduleDialog } from "@/components/employees/schedule/day-schedule-dialog";

type EmployeeOption = { id: string; name: string };

function ShiftBadges({ shifts }: { shifts: ScheduleShiftGroups }) {
  const t = useTranslations();
  const groups = (["MORNING", "EVENING", "FULL_DAY"] as const).filter((s) => shifts[s].length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {groups.map((s) => (
        <Badge key={s} variant="secondary" className="text-[11px] font-normal">
          {shiftLabel(t, s)}: {shifts[s].map((e) => e.name).join(", ")}
        </Badge>
      ))}
    </div>
  );
}

export function ScheduleGrid({
  days,
  employeesByBranch,
  canManage,
}: {
  days: ScheduleDay[];
  employeesByBranch: Record<string, EmployeeOption[]>;
  canManage: boolean;
}) {
  const t = useTranslations("employees.schedule");
  const locale = useLocale();

  if (days.length === 0) return null;
  const branches = days[0].branches;

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-start font-medium text-muted-foreground">
                {t("title")}
              </th>
              {branches.map((b) => (
                <th key={b.branchId} className="min-w-48 p-3 text-start font-medium text-muted-foreground">
                  {b.branchName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.dateKey} className="border-b border-border last:border-0">
                <td className="p-3 align-top font-medium whitespace-nowrap">
                  {formatDate(day.dateKey, locale)}
                </td>
                {day.branches.map((branch) => {
                  const content = (
                    <div className="space-y-1.5">
                      {branch.hasGap ? (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          <span className="text-xs font-medium">{t("coverageGap")}</span>
                        </div>
                      ) : (
                        <ShiftBadges shifts={branch.shifts} />
                      )}
                    </div>
                  );

                  return (
                    <td key={branch.branchId} className="p-3 align-top">
                      {canManage ? (
                        <DayScheduleDialog
                          branchId={branch.branchId}
                          branchName={branch.branchName}
                          dateKey={day.dateKey}
                          employees={employeesByBranch[branch.branchId] ?? []}
                          shifts={branch.shifts}
                          trigger={
                            <button
                              type="button"
                              className="w-full min-w-40 rounded-md p-1 text-start transition-colors hover:bg-accent"
                              aria-label={t("editAria", {
                                branch: branch.branchName,
                                date: formatDate(day.dateKey, locale),
                              })}
                            >
                              {content}
                            </button>
                          }
                        />
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
