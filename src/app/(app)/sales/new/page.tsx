import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SalesEntryForm } from "@/components/sales/sales-entry-form";
import { FadeIn } from "@/components/motion/fade-in";
import { getBranchesForUser, getBranchProductsMap } from "@/lib/queries/sales";
import { todayDateKey } from "@/lib/format";
import type { SalesEntryFormInput } from "@/lib/validations/sales";

export default async function NewSalesEntryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isOwner = session.user.role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [branches, branchProductsMap] = await Promise.all([
    getBranchesForUser(scopedBranchId),
    getBranchProductsMap(),
  ]);

  const defaultValues: SalesEntryFormInput = {
    branchId: isOwner ? "" : (branches[0]?.id ?? ""),
    date: todayDateKey(),
    totalIls: "",
    orderCount: "",
    notes: "",
    lineItems: [],
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">New Sales Entry</h1>
        <p className="mt-1 text-muted-foreground">Log today&apos;s totals for a branch.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <SalesEntryForm
          mode="create"
          branches={branches}
          branchProductsMap={branchProductsMap}
          isOwner={isOwner}
          defaultValues={defaultValues}
        />
      </FadeIn>
    </div>
  );
}
