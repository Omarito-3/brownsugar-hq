import { redirect, notFound } from "next/navigation";

import { auth } from "@/auth";
import { SalesEntryForm } from "@/components/sales/sales-entry-form";
import { FadeIn } from "@/components/motion/fade-in";
import {
  getBranchesForUser,
  getBranchProductsMap,
  getSalesEntryForEdit,
} from "@/lib/queries/sales";
import type { SalesEntryFormInput } from "@/lib/validations/sales";

export default async function EditSalesEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const entry = await getSalesEntryForEdit(id);
  if (!entry) notFound();

  const isOwner = session.user.role === "OWNER";
  const canEdit = isOwner || entry.branchId === session.user.branchId;
  if (!canEdit) redirect("/sales");

  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [branches, branchProductsMap] = await Promise.all([
    getBranchesForUser(scopedBranchId),
    getBranchProductsMap(),
  ]);

  const defaultValues: SalesEntryFormInput = {
    branchId: entry.branchId,
    date: entry.date,
    totalIls: entry.totalIls,
    orderCount: entry.orderCount,
    notes: entry.notes,
    lineItems: entry.lineItems,
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">Edit Sales Entry</h1>
        <p className="mt-1 text-muted-foreground">Update the totals for this entry.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <SalesEntryForm
          mode="edit"
          entryId={entry.id}
          branches={branches}
          branchProductsMap={branchProductsMap}
          isOwner={isOwner}
          defaultValues={defaultValues}
        />
      </FadeIn>
    </div>
  );
}
