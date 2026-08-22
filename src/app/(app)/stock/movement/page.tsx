import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { MovementForm } from "@/components/stock/movement-form";
import { FadeIn } from "@/components/motion/fade-in";
import { getBranchesForUser } from "@/lib/queries/shared";
import { getStockItemsForForm, getSuppliersForForm } from "@/lib/queries/stock";

export default async function StockMovementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("stock");
  const isOwner = session.user.role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [branches, allBranches, items, suppliers] = await Promise.all([
    getBranchesForUser(scopedBranchId),
    isOwner ? getBranchesForUser() : Promise.resolve([]),
    getStockItemsForForm(),
    getSuppliersForForm(),
  ]);

  // Owners need the full branch list for transfers (from/to), even though
  // `branches` above may already be the full list for them — kept separate
  // so non-owners never receive branches beyond their own from either call.
  const branchOptions = isOwner ? allBranches : branches;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("movementPageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("movementPageSubtitle")}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <MovementForm
          branches={branchOptions}
          items={items}
          suppliers={suppliers}
          isOwner={isOwner}
          defaultBranchId={isOwner ? "" : (branches[0]?.id ?? "")}
        />
      </FadeIn>
    </div>
  );
}
