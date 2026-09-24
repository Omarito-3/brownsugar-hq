import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { getBranchScope } from "@/lib/permissions";
import { MovementForm } from "@/components/stock/movement-form";
import { FadeIn } from "@/components/motion/fade-in";
import {
  getStockItemsForForm,
  getSuppliersForForm,
  getStockLocations,
} from "@/lib/queries/stock";

export default async function StockMovementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("stock");
  const isOwner = session.user.role === "OWNER";
  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  const [locations, items, suppliers] = await Promise.all([
    getStockLocations(scopedBranchId),
    getStockItemsForForm(),
    getSuppliersForForm(),
  ]);

  // Non-owners record movements only against their own branch's location —
  // warehouses are visible to them for requests, but not writable here.
  const writableLocations = isOwner
    ? locations
    : locations.filter((l) => l.branchId === scopedBranchId);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("movementPageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("movementPageSubtitle")}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <MovementForm
          locations={isOwner ? locations : writableLocations}
          items={items}
          suppliers={suppliers}
          isOwner={isOwner}
          defaultLocationId={isOwner ? "" : (writableLocations[0]?.id ?? "")}
        />
      </FadeIn>
    </div>
  );
}
