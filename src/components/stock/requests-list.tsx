"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import {
  approveStockRequest,
  rejectStockRequest,
  fulfillStockRequest,
} from "@/lib/actions/stock-requests";
import { requestStatusLabel, unitLabel } from "@/lib/stock-labels";
import { formatDate, localizedName } from "@/lib/format";
import type { StockRequestRow } from "@/lib/queries/stock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  APPROVED: "border-primary/40 bg-primary/10 text-primary",
  FULFILLED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  REJECTED: "border-destructive/40 bg-destructive/10 text-destructive",
};

function RequestCard({
  request,
  canReview,
}: {
  request: StockRequestRow;
  canReview: boolean;
}) {
  const t = useTranslations("stock");
  const tRoot = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const showApproveReject = canReview && request.status === "PENDING";
  const showFulfill = canReview && request.status === "APPROVED";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-1.5 font-medium">
            {localizedName(
              request.fulfillingLocationName,
              request.fulfillingLocationNameAr,
              locale
            )}
            <ArrowRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
            {localizedName(
              request.requestingLocationName,
              request.requestingLocationNameAr,
              locale
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("requestsPage.requestedBy", { name: request.requestedByName })} ·{" "}
            {formatDate(request.createdAt, locale)}
            {request.reviewedByName
              ? ` · ${t("requestsPage.reviewedBy", { name: request.reviewedByName })}`
              : ""}
          </p>
        </div>
        <Badge variant="outline" className={STATUS_COLORS[request.status]}>
          {requestStatusLabel(tRoot, request.status)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          {request.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span>{localizedName(item.itemName, item.itemNameAr, locale)}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {item.quantityFulfilled != null
                  ? t("requestsPage.fulfilledQuantity", {
                      fulfilled: `${item.quantityFulfilled} ${unitLabel(tRoot, item.unit)}`,
                      requested: `${item.quantityRequested} ${unitLabel(tRoot, item.unit)}`,
                    })
                  : `${item.quantityRequested} ${unitLabel(tRoot, item.unit)}`}
              </span>
            </li>
          ))}
        </ul>

        {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}

        {(showApproveReject || showFulfill) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {showApproveReject && (
              <>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    run(() => approveStockRequest(request.id), t("requestsPage.approvedToast"))
                  }
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {t("requestsPage.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  className="text-destructive hover:text-destructive"
                  onClick={() =>
                    run(() => rejectStockRequest(request.id), t("requestsPage.rejectedToast"))
                  }
                >
                  <X className="size-4" />
                  {t("requestsPage.reject")}
                </Button>
              </>
            )}
            {showFulfill && (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() => fulfillStockRequest(request.id), t("requestsPage.fulfilledToast"))
                }
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PackageCheck className="size-4" />
                )}
                {t("requestsPage.fulfill")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RequestsList({
  requests,
  approverLocationIds,
}: {
  requests: StockRequestRow[];
  approverLocationIds: string[];
}) {
  const t = useTranslations("stock");
  const approverSet = new Set(approverLocationIds);

  if (requests.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("requestsPage.noRequests")}</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          canReview={approverSet.has(request.fulfillingLocationId)}
        />
      ))}
    </div>
  );
}
