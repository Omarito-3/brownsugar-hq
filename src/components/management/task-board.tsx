"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { taskStatusValues } from "@/lib/validations/management";
import { deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import { taskPriorityLabel } from "@/lib/management-labels";
import { formatDate } from "@/lib/format";
import type { TaskRow } from "@/lib/queries/management";
import { TaskFormDialog } from "@/components/management/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BranchOption = { id: string; name: string };
type UserOption = { id: string; name: string };

const ALL = "ALL";
const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "border-destructive/40 bg-destructive/10 text-destructive",
  MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  LOW: "border-border bg-muted text-muted-foreground",
};

function TaskCard({
  task,
  branches,
  assignableUsers,
  isOwner,
  defaultBranchId,
}: {
  task: TaskRow;
  branches: BranchOption[];
  assignableUsers: UserOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("management");
  const tCommon = useTranslations("common");
  const tRoot = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) {
        toast.success(t("taskDeleted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await setTaskStatus(task.id, status as (typeof taskStatusValues)[number]);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <Card className="gap-3 py-3">
      <CardContent className="space-y-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{task.title}</p>
          <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
            {taskPriorityLabel(tRoot, task.priority)}
          </Badge>
        </div>
        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
        <p className="text-xs text-muted-foreground">
          {task.branchName ?? t("allBranches")} · {task.assignedToName ?? t("unassigned")}
        </p>
        {task.dueDate && (
          <p className="text-xs text-muted-foreground">
            {t("dueLabel", { date: formatDate(task.dueDate, locale) })}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Select value={task.status} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="h-8 w-32 text-xs">
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
          <div className="flex items-center gap-1">
            <TaskFormDialog
              mode="edit"
              taskId={task.id}
              branches={branches}
              assignableUsers={assignableUsers}
              isOwner={isOwner}
              defaultBranchId={defaultBranchId}
              defaultValues={{
                title: task.title,
                description: task.description ?? "",
                branchId: task.branchId ?? "",
                assignedToId: task.assignedToId ?? "",
                status: task.status as (typeof taskStatusValues)[number],
                priority: task.priority as "LOW" | "MEDIUM" | "HIGH",
                dueDate: task.dueDate ?? "",
              }}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("editAria", { title: task.title })}
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("deleteAria", { title: task.title })}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteTaskTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteTaskDescription", { title: task.title })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>{tCommon("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    disabled={isPending}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    {tCommon("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskBoard({
  tasks,
  branches,
  assignableUsers,
  isOwner,
  defaultBranchId,
}: {
  tasks: TaskRow[];
  branches: BranchOption[];
  assignableUsers: UserOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("management");
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (branchFilter === ALL || task.branchId === branchFilter) &&
          (assigneeFilter === ALL || task.assignedToId === assigneeFilter)
      ),
    [tasks, branchFilter, assigneeFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium">{t("tasksHeading")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allBranches")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allAssignees")}</SelectItem>
              {assignableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TaskFormDialog
            mode="create"
            branches={branches}
            assignableUsers={assignableUsers}
            isOwner={isOwner}
            defaultBranchId={defaultBranchId}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                {t("addTask")}
              </Button>
            }
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noTasks")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {taskStatusValues.map((status) => (
            <Card key={status} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(`statuses.${status}`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-3">
                {filtered
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      branches={branches}
                      assignableUsers={assignableUsers}
                      isOwner={isOwner}
                      defaultBranchId={defaultBranchId}
                    />
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
