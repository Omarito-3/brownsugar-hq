import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { getBranchScope } from "@/lib/permissions";
import { SalesEntryForm } from "@/components/sales/sales-entry-form";
import { FadeIn } from "@/components/motion/fade-in";
import { getBranchProductsMap, getSalesEntryForEdit } from "@/lib/queries/sales";
import { getBranchesForUser, getCurrencies } from "@/lib/queries/shared";
import type { SalesEntryFormInput } from "@/lib/validations/sales";

export default async function EditSalesEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  const entry = await getSalesEntryForEdit(id);
  if (!entry) notFound();

  const t = await getTranslations("sales");
  const isOwner = session.user.role === "OWNER";
  const canEdit = isOwner || entry.branchId === session.user.branchId;
  if (!canEdit) redirect("/sales");

  const [branches, branchProductsMap, currencies] = await Promise.all([
    getBranchesForUser(scopedBranchId),
    getBranchProductsMap(),
    getCurrencies(),
  ]);

  const defaultValues: SalesEntryFormInput = {
    branchId: entry.branchId,
    date: entry.date,
    orderCount: entry.orderCount,
    notes: entry.notes,
    currencyAmounts:
      entry.currencyAmounts.length > 0
        ? entry.currencyAmounts
        : [{ currencyCode: "ILS", amountOriginal: "" }],
    lineItems: entry.lineItems,
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("editPageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("editPageSubtitle")}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <SalesEntryForm
          mode="edit"
          entryId={entry.id}
          branches={branches}
          branchProductsMap={branchProductsMap}
          currencies={currencies}
          isOwner={isOwner}
          defaultValues={defaultValues}
        />
      </FadeIn>
    </div>
  );
}
