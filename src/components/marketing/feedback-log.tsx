"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { feedbackSentimentValues } from "@/lib/validations/marketing";
import { deleteFeedback } from "@/lib/actions/feedback";
import { feedbackSourceLabel, feedbackSentimentLabel } from "@/lib/marketing-labels";
import { formatDate } from "@/lib/format";
import type { FeedbackRow } from "@/lib/queries/marketing";
import { FeedbackFormDialog } from "@/components/marketing/feedback-form-dialog";
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
const ALL = "ALL";

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  NEUTRAL: "border-border bg-muted text-muted-foreground",
  NEGATIVE: "border-destructive/40 bg-destructive/10 text-destructive",
};

function FeedbackRowActions({
  feedback,
  branches,
  isOwner,
  defaultBranchId,
}: {
  feedback: FeedbackRow;
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("marketing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFeedback(feedback.id);
      if (result.ok) {
        toast.success(t("feedbackDeleted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <FeedbackFormDialog
        mode="edit"
        feedbackId={feedback.id}
        branches={branches}
        isOwner={isOwner}
        defaultBranchId={defaultBranchId}
        defaultValues={{
          branchId: feedback.branchId,
          date: feedback.date,
          source: feedback.source as "IN_PERSON" | "INSTAGRAM" | "GOOGLE_REVIEW" | "OTHER",
          sentiment: feedback.sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE",
          content: feedback.content,
        }}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("editFeedbackAria")}>
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteFeedbackAria")}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFeedbackTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteFeedbackDescription")}</AlertDialogDescription>
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
  );
}

export function FeedbackLog({
  feedback,
  branches,
  isOwner,
  defaultBranchId,
}: {
  feedback: FeedbackRow[];
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("marketing");
  const tRoot = useTranslations();
  const tManagement = useTranslations("management");
  const locale = useLocale();
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [sentimentFilter, setSentimentFilter] = useState(ALL);

  const filtered = useMemo(
    () =>
      feedback.filter(
        (f) =>
          (branchFilter === ALL || f.branchId === branchFilter) &&
          (sentimentFilter === ALL || f.sentiment === sentimentFilter)
      ),
    [feedback, branchFilter, sentimentFilter]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("feedbackHeading")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{tManagement("allBranches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allSentiments")}</SelectItem>
              {feedbackSentimentValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {feedbackSentimentLabel(tRoot, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FeedbackFormDialog
            mode="create"
            branches={branches}
            isOwner={isOwner}
            defaultBranchId={defaultBranchId}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                {t("addFeedback")}
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noFeedback")}</p>
        ) : (
          filtered.map((f) => (
            <div key={f.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={SENTIMENT_COLORS[f.sentiment]}>
                    {feedbackSentimentLabel(tRoot, f.sentiment)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {feedbackSourceLabel(tRoot, f.source)} · {f.branchName} ·{" "}
                    {formatDate(f.date, locale)}
                  </span>
                </div>
                <FeedbackRowActions
                  feedback={f}
                  branches={branches}
                  isOwner={isOwner}
                  defaultBranchId={defaultBranchId}
                />
              </div>
              <p className="text-sm">{f.content}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
