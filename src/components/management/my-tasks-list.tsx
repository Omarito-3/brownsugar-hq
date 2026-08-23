"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { taskStatusValues } from "@/lib/validations/management";
import { setTaskStatus } from "@/lib/actions/tasks";
import { taskPriorityLabel } from "@/lib/management-labels";
import { formatDate } from "@/lib/format";
import type { TaskRow } from "@/lib/queries/management";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "border-destructive/40 bg-destructive/10 text-destructive",
  MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  LOW: "border-border bg-muted text-muted-foreground",
};

function MyTaskRow({ task }: { task: TaskRow }) {
  const t = useTranslations("management");
  const tRoot = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await setTaskStatus(task.id, status as (typeof taskStatusValues)[number]);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{task.title}</p>
        <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
          {taskPriorityLabel(tRoot, task.priority)}
        </Badge>
      </div>
      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
      {task.dueDate && (
        <p className="text-xs text-muted-foreground">
          {t("dueLabel", { date: formatDate(task.dueDate, locale) })}
        </p>
      )}
      <Select value={task.status} onValueChange={handleStatusChange} disabled={isPending}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {taskStatusValues.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {t(`statuses.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function MyTasksList({ tasks }: { tasks: TaskRow[] }) {
  const t = useTranslations("management");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tasksHeading")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("myTasksNote")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noTasks")}</p>
        ) : (
          tasks.map((task) => <MyTaskRow key={task.id} task={task} />)
        )}
      </CardContent>
    </Card>
  );
}
