"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  menuExperimentSchema,
  experimentStatusValues,
  type MenuExperimentInput,
  type MenuExperimentFormInput,
} from "@/lib/validations/marketing";
import { createMenuExperiment, updateMenuExperiment } from "@/lib/actions/menu-experiments";
import { experimentStatusLabel } from "@/lib/marketing-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function ExperimentFormDialog({
  mode,
  experimentId,
  branches,
  isOwner,
  defaultBranchId,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  experimentId?: string;
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
  defaultValues?: MenuExperimentFormInput;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("marketing");
  const tRoot = useTranslations();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initialValues: MenuExperimentFormInput = defaultValues ?? {
    productName: "",
    notes: "",
    status: "IDEA",
    branchId: isOwner ? "" : defaultBranchId,
  };

  const form = useForm<MenuExperimentFormInput, unknown, MenuExperimentInput>({
    resolver: zodResolver(menuExperimentSchema(t)),
    defaultValues: initialValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initialValues);
  }

  async function onSubmit(values: MenuExperimentInput) {
    setIsPending(true);
    const result =
      mode === "create"
        ? await createMenuExperiment(values)
        : await updateMenuExperiment(experimentId!, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? t("experimentForm.savedToast") : t("experimentForm.updatedToast"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("experimentForm.addTitle") : t("experimentForm.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("experimentForm.productName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("experimentForm.productNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isOwner && (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("experimentForm.branch")}</FormLabel>
                    <Select
                      value={field.value || "ALL"}
                      onValueChange={(v) => field.onChange(v === "ALL" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("experimentForm.selectBranch")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">{t("experimentForm.allBranchesOption")}</SelectItem>
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
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("experimentForm.status")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("experimentForm.selectStatus")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {experimentStatusValues.map((s) => (
                        <SelectItem key={s} value={s}>
                          {experimentStatusLabel(tRoot, s)}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("experimentForm.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={t("experimentForm.notesPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("experimentForm.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
