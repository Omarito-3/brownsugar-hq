"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  taskSchema,
  taskStatusValues,
  taskPriorityValues,
  type TaskInput,
  type TaskFormInput,
} from "@/lib/validations/management";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { taskPriorityLabel, taskStatusLabel } from "@/lib/management-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchOption = { id: string; name: string };
type UserOption = { id: string; name: string };

export function TaskFormDialog({
  mode,
  taskId,
  branches,
  assignableUsers,
  isOwner,
  defaultBranchId,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  taskId?: string;
  branches: BranchOption[];
  assignableUsers: UserOption[];
  isOwner: boolean;
  defaultBranchId: string;
  defaultValues?: TaskFormInput;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("management");
  const tRoot = useTranslations();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initialValues: TaskFormInput = defaultValues ?? {
    title: "",
    description: "",
    branchId: isOwner ? "" : defaultBranchId,
    assignedToId: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
  };

  const form = useForm<TaskFormInput, unknown, TaskInput>({
    resolver: zodResolver(taskSchema(t)),
    defaultValues: initialValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initialValues);
  }

  async function onSubmit(values: TaskInput) {
    setIsPending(true);
    const result = mode === "create" ? await createTask(values) : await updateTask(taskId!, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? t("taskForm.savedToast") : t("taskForm.updatedToast"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("taskForm.addTitle") : t("taskForm.editTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taskForm.title")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("taskForm.titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taskForm.descriptionOptional")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isOwner ? (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskForm.branch")}</FormLabel>
                    <Select
                      value={field.value || "ALL"}
                      onValueChange={(v) => field.onChange(v === "ALL" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("taskForm.selectBranch")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">{t("taskForm.allBranchesOption")}</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div>
                <Label>{t("taskForm.branch")}</Label>
                <div className="mt-2 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {branches.find((b) => b.id === defaultBranchId)?.name}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taskForm.assignee")}</FormLabel>
                  <Select
                    value={field.value || "NONE"}
                    onValueChange={(v) => field.onChange(v === "NONE" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("taskForm.selectAssignee")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">{t("taskForm.unassignedOption")}</SelectItem>
                      {assignableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskForm.priority")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("taskForm.selectPriority")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskPriorityValues.map((p) => (
                          <SelectItem key={p} value={p}>
                            {taskPriorityLabel(tRoot, p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskForm.status")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskStatusValues.map((s) => (
                          <SelectItem key={s} value={s}>
                            {taskStatusLabel(tRoot, s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("taskForm.dueDateOptional")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("taskForm.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
