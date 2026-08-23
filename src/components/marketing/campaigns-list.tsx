"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { deleteCampaign } from "@/lib/actions/campaigns";
import { campaignChannelLabel } from "@/lib/marketing-labels";
import { formatDate, formatIls, formatPercent } from "@/lib/format";
import type { CampaignWithImpact } from "@/lib/queries/marketing";
import { CampaignFormDialog } from "@/components/marketing/campaign-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

function CampaignImpactBlock({ campaign }: { campaign: CampaignWithImpact }) {
  const t = useTranslations("marketing");

  if (!campaign.impact) {
    return <p className="text-xs text-muted-foreground">{t("impactNotStarted")}</p>;
  }

  const { avgDuring, avgBefore, changePercent } = campaign.impact;
  const isUp = changePercent != null && changePercent > 0;
  const isDown = changePercent != null && changePercent < 0;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <span className="text-muted-foreground">
        {t("impactDuring")}: <span className="font-medium text-foreground">{formatIls(avgDuring, true)}</span>
      </span>
      <span className="text-muted-foreground">
        {t("impactBefore")}: <span className="font-medium text-foreground">{formatIls(avgBefore, true)}</span>
      </span>
      {changePercent == null ? (
        <span className="text-muted-foreground">{t("impactNoBaseline")}</span>
      ) : (
        <span
          className={`flex items-center gap-1 font-medium ${isUp ? "text-emerald-500" : isDown ? "text-destructive" : "text-muted-foreground"}`}
        >
          <Icon className="size-3.5" />
          {formatPercent(changePercent)}
        </span>
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  branches,
  isOwner,
  defaultBranchId,
}: {
  campaign: CampaignWithImpact;
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("marketing");
  const tRoot = useTranslations();
  const tCommon = useTranslations("common");
  const tManagement = useTranslations("management");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id);
      if (result.ok) {
        toast.success(t("campaignDeleted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2">
        <div>
          <p className="font-medium">{campaign.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(campaign.startDate, locale)} – {formatDate(campaign.endDate, locale)} ·{" "}
            {campaign.branchName ?? tManagement("allBranches")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <CampaignFormDialog
            mode="edit"
            campaignId={campaign.id}
            branches={branches}
            isOwner={isOwner}
            defaultBranchId={defaultBranchId}
            defaultValues={{
              name: campaign.name,
              description: campaign.description ?? "",
              branchId: campaign.branchId ?? "",
              startDate: campaign.startDate,
              endDate: campaign.endDate,
              budgetIls: campaign.budgetIls ?? "",
              channel: campaign.channel as "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "IN_STORE" | "INFLUENCER" | "OTHER",
              notes: campaign.notes ?? "",
            }}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={t("editAria", { name: campaign.name })}>
                <Pencil className="size-4" />
              </Button>
            }
          />
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("deleteAria", { name: campaign.name })}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteCampaignTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteCampaignDescription", { name: campaign.name })}
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
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{campaignChannelLabel(tRoot, campaign.channel)}</Badge>
          <span className="text-sm text-muted-foreground">
            {campaign.budgetIls != null ? formatIls(campaign.budgetIls) : t("noBudget")}
          </span>
          {campaign.hasExpense && (
            <Badge variant="outline" className="text-[11px]">
              {t("expenseLoggedBadge")}
            </Badge>
          )}
        </div>
        {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        <CampaignImpactBlock campaign={campaign} />
      </CardContent>
    </Card>
  );
}

export function CampaignsList({
  campaigns,
  branches,
  isOwner,
  defaultBranchId,
}: {
  campaigns: CampaignWithImpact[];
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("marketing");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("campaignsHeading")}</h2>
        <CampaignFormDialog
          mode="create"
          branches={branches}
          isOwner={isOwner}
          defaultBranchId={defaultBranchId}
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              {t("addCampaign")}
            </Button>
          }
        />
      </div>

      {campaigns.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noCampaigns")}</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              branches={branches}
              isOwner={isOwner}
              defaultBranchId={defaultBranchId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
