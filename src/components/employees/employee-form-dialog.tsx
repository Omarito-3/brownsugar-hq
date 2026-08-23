"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  employeeSchema,
  positionValues,
  type EmployeeInput,
  type EmployeeFormInput,
} from "@/lib/validations/employees";
import { createEmployee, updateEmployee } from "@/lib/actions/employees";
import { useSound } from "@/hooks/use-sound";
import { todayDateKey } from "@/lib/format";
import { positionLabel } from "@/lib/employee-labels";
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

export function EmployeeFormDialog({
  mode,
  employeeId,
  branches,
  isOwner,
  defaultBranchId,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  employeeId?: string;
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
  defaultValues?: EmployeeFormInput;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("employees");
  const tRoot = useTranslations();
  const playSaved = useSound("saved");
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initialValues: EmployeeFormInput = defaultValues ?? {
    name: "",
    phone: "",
    branchId: isOwner ? "" : defaultBranchId,
    position: "BARISTA",
    salaryIls: "" as unknown as number,
    startDate: todayDateKey(),
    notes: "",
  };

  const form = useForm<EmployeeFormInput, unknown, EmployeeInput>({
    resolver: zodResolver(employeeSchema(t)),
    defaultValues: initialValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initialValues);
  }

  async function onSubmit(values: EmployeeInput) {
    setIsPending(true);
    const result =
      mode === "create" ? await createEmployee(values) : await updateEmployee(employeeId!, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    playSaved();
    toast.success(mode === "create" ? t("form.savedToast") : t("form.updatedToast"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.addTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.phoneOptional")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <FormLabel>{t("form.branch")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("form.selectBranch")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                <Label>{t("form.branch")}</Label>
                <div className="mt-2 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {branches.find((b) => b.id === defaultBranchId)?.name}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.position")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("form.selectPosition")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positionValues.map((p) => (
                        <SelectItem key={p} value={p}>
                          {positionLabel(tRoot, p)}
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
                name="salaryIls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.salary")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value as number | string}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.startDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.notesOptional")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder={t("form.notesPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("form.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
