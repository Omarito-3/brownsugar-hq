"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  campaignSchema,
  campaignChannelValues,
  type CampaignInput,
  type CampaignFormInput,
} from "@/lib/validations/marketing";
import { createCampaign, updateCampaign } from "@/lib/actions/campaigns";
import { campaignChannelLabel } from "@/lib/marketing-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

export function CampaignFormDialog({
  mode,
  campaignId,
  branches,
  isOwner,
  defaultBranchId,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  campaignId?: string;
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
  defaultValues?: CampaignFormInput;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("marketing");
  const tRoot = useTranslations();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initialValues: CampaignFormInput = defaultValues ?? {
    name: "",
    description: "",
    branchId: isOwner ? "" : defaultBranchId,
    startDate: "",
    endDate: "",
    budgetIls: "" as unknown as number,
    channel: "INSTAGRAM",
    notes: "",
    createExpense: false,
  };

  const form = useForm<CampaignFormInput, unknown, CampaignInput>({
    resolver: zodResolver(campaignSchema(t)),
    defaultValues: initialValues,
  });

  const branchId = useWatch({ control: form.control, name: "branchId" });
  const canCreateExpense = mode === "create" && !!branchId;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initialValues);
  }

  async function onSubmit(values: CampaignInput) {
    setIsPending(true);
    const result =
      mode === "create" ? await createCampaign(values) : await updateCampaign(campaignId!, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? t("campaignForm.savedToast") : t("campaignForm.updatedToast"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("campaignForm.addTitle") : t("campaignForm.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("campaignForm.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("campaignForm.namePlaceholder")} {...field} />
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
                  <FormLabel>{t("campaignForm.descriptionOptional")}</FormLabel>
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
                    <FormLabel>{t("campaignForm.branch")}</FormLabel>
                    <Select
                      value={field.value || "ALL"}
                      onValueChange={(v) => field.onChange(v === "ALL" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("campaignForm.selectBranch")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">{t("campaignForm.allBranchesOption")}</SelectItem>
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
                <Label>{t("campaignForm.branch")}</Label>
                <div className="mt-2 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {branches.find((b) => b.id === defaultBranchId)?.name}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("campaignForm.startDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("campaignForm.endDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budgetIls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("campaignForm.budgetOptional")}</FormLabel>
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
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("campaignForm.channel")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("campaignForm.selectChannel")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {campaignChannelValues.map((c) => (
                          <SelectItem key={c} value={c}>
                            {campaignChannelLabel(tRoot, c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mode === "create" && (
              <FormField
                control={form.control}
                name="createExpense"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!canCreateExpense}
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="font-normal">
                          {t("campaignForm.createExpenseLabel")}
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          {canCreateExpense
                            ? t("campaignForm.createExpenseHint")
                            : t("campaignForm.createExpenseDisabledHint")}
                        </p>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("campaignForm.notesOptional")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("campaignForm.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
