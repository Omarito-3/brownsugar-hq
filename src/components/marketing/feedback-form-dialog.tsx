"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  feedbackSchema,
  feedbackSourceValues,
  feedbackSentimentValues,
  type FeedbackInput,
  type FeedbackFormInput,
} from "@/lib/validations/marketing";
import { createFeedback, updateFeedback } from "@/lib/actions/feedback";
import { feedbackSourceLabel, feedbackSentimentLabel } from "@/lib/marketing-labels";
import { todayDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export function FeedbackFormDialog({
  mode,
  feedbackId,
  branches,
  isOwner,
  defaultBranchId,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  feedbackId?: string;
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
  defaultValues?: FeedbackFormInput;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("marketing");
  const tRoot = useTranslations();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initialValues: FeedbackFormInput = defaultValues ?? {
    branchId: isOwner ? "" : defaultBranchId,
    date: todayDateKey(),
    source: "IN_PERSON",
    sentiment: "NEUTRAL",
    content: "",
  };

  const form = useForm<FeedbackFormInput, unknown, FeedbackInput>({
    resolver: zodResolver(feedbackSchema(t)),
    defaultValues: initialValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initialValues);
  }

  async function onSubmit(values: FeedbackInput) {
    setIsPending(true);
    const result =
      mode === "create" ? await createFeedback(values) : await updateFeedback(feedbackId!, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? t("feedbackForm.savedToast") : t("feedbackForm.updatedToast"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("feedbackForm.addTitle") : t("feedbackForm.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isOwner ? (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("feedbackForm.branch")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("feedbackForm.selectBranch")} />
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
                <Label>{t("feedbackForm.branch")}</Label>
                <div className="mt-2 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {branches.find((b) => b.id === defaultBranchId)?.name}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedbackForm.date")}</FormLabel>
                  <FormControl>
                    <Input type="date" max={todayDateKey()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("feedbackForm.source")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("feedbackForm.selectSource")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {feedbackSourceValues.map((s) => (
                          <SelectItem key={s} value={s}>
                            {feedbackSourceLabel(tRoot, s)}
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
                name="sentiment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("feedbackForm.sentiment")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("feedbackForm.selectSentiment")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {feedbackSentimentValues.map((s) => (
                          <SelectItem key={s} value={s}>
                            {feedbackSentimentLabel(tRoot, s)}
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedbackForm.content")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={t("feedbackForm.contentPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("feedbackForm.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
