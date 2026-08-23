"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { setDaySchedule } from "@/lib/actions/schedule";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScheduleShiftGroups } from "@/lib/queries/employees";

type EmployeeOption = { id: string; name: string };
type ShiftValue = "NONE" | "MORNING" | "EVENING" | "FULL_DAY";

function currentShiftFor(employeeId: string, shifts: ScheduleShiftGroups): ShiftValue {
  if (shifts.MORNING.some((e) => e.id === employeeId)) return "MORNING";
  if (shifts.EVENING.some((e) => e.id === employeeId)) return "EVENING";
  if (shifts.FULL_DAY.some((e) => e.id === employeeId)) return "FULL_DAY";
  return "NONE";
}

export function DayScheduleDialog({
  branchId,
  branchName,
  dateKey,
  employees,
  shifts,
  trigger,
}: {
  branchId: string;
  branchName: string;
  dateKey: string;
  employees: EmployeeOption[];
  shifts: ScheduleShiftGroups;
  trigger: React.ReactNode;
}) {
  const t = useTranslations("employees.schedule");
  const tShifts = useTranslations("employees.shifts");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, ShiftValue>>(() =>
    Object.fromEntries(employees.map((e) => [e.id, currentShiftFor(e.id, shifts)]))
  );
  const [isPending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValues(Object.fromEntries(employees.map((e) => [e.id, currentShiftFor(e.id, shifts)])));
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await setDaySchedule({
        branchId,
        date: dateKey,
        assignments: employees.map((e) => ({
          employeeId: e.id,
          shift: values[e.id] === "NONE" ? null : (values[e.id] as "MORNING" | "EVENING" | "FULL_DAY"),
        })),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(t("savedToast"));
      setOpen(false);
      router.refresh();
    });
  }

  const dateLabel = formatDate(dateKey, locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle", { branch: branchName, date: dateLabel })}</DialogTitle>
        </DialogHeader>

        {employees.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("noEmployees")}</p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{employee.name}</span>
                <Select
                  value={values[employee.id] ?? "NONE"}
                  onValueChange={(value) =>
                    setValues((prev) => ({ ...prev, [employee.id]: value as ShiftValue }))
                  }
                >
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t("none")}</SelectItem>
                    <SelectItem value="MORNING">{tShifts("MORNING")}</SelectItem>
                    <SelectItem value="EVENING">{tShifts("EVENING")}</SelectItem>
                    <SelectItem value="FULL_DAY">{tShifts("FULL_DAY")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || employees.length === 0}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("saveSchedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
