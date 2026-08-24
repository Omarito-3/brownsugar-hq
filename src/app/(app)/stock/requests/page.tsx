import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { RequestsList } from "@/components/stock/requests-list";
import { RequestFormDialog } from "@/components/stock/request-form-dialog";
import {
  getStockRequests,
  getStockLocations,
  getWarehouses,
  getStockItemsForForm,
  getApproverLocationIds,
} from "@/lib/queries/stock";

export default async function StockRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("stock");
  const { role } = session.user;
  const isOwner = role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [requests, locations, warehouses, items, approverLocationIds] = await Promise.all([
    getStockRequests(scopedBranchId),
    getStockLocations(scopedBranchId),
    getWarehouses(),
    getStockItemsForForm(),
    getApproverLocationIds(role, scopedBranchId),
  ]);

  // You request stock *for* a branch location, never for a warehouse.
  const requestableLocations = locations.filter((l) => l.type === "BRANCH");

  return (
    <div className="space-y-6">
      <FadeIn className="space-y-4">
        <Link
          href="/stock"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("title")}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("requestsPage.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("requestsPage.subtitle")}</p>
          </div>
          {requestableLocations.length > 0 && warehouses.length > 0 && (
            <RequestFormDialog
              requestableLocations={requestableLocations}
              warehouses={warehouses}
              items={items}
              defaultRequestingLocationId={requestableLocations[0]?.id ?? ""}
            />
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <RequestsList requests={requests} approverLocationIds={approverLocationIds} />
      </FadeIn>
    </div>
  );
}
