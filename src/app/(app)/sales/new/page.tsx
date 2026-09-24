import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { getBranchScope } from "@/lib/permissions";
import { SalesEntryForm } from "@/components/sales/sales-entry-form";
import { FadeIn } from "@/components/motion/fade-in";
import { getBranchProductsMap } from "@/lib/queries/sales";
import { getBranchesForUser, getCurrencies } from "@/lib/queries/shared";
import { todayDateKey } from "@/lib/format";
import type { SalesEntryFormInput } from "@/lib/validations/sales";

export default async function NewSalesEntryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("sales");
  const isOwner = session.user.role === "OWNER";
  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  const [branches, branchProductsMap, currencies] = await Promise.all([
    getBranchesForUser(scopedBranchId),
    getBranchProductsMap(),
    getCurrencies(),
  ]);

  const defaultValues: SalesEntryFormInput = {
    branchId: isOwner ? "" : (branches[0]?.id ?? ""),
    date: todayDateKey(),
    orderCount: "",
    notes: "",
    currencyAmounts: [{ currencyCode: "ILS", amountOriginal: "" }],
    lineItems: [],
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("newPageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("newPageSubtitle")}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <SalesEntryForm
          mode="create"
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
