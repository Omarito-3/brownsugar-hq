import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { ExpenseForm } from "@/components/finance/expense-form";
import { FadeIn } from "@/components/motion/fade-in";
import { getBranchesForUser, getCurrencies } from "@/lib/queries/shared";
import { getExpenseForEdit } from "@/lib/queries/finance";
import type { ExpenseFormInput } from "@/lib/validations/finance";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const expense = await getExpenseForEdit(id);
  if (!expense) notFound();

  const t = await getTranslations("finance");
  const isOwner = session.user.role === "OWNER";
  const canEdit = isOwner || expense.branchId === session.user.branchId;
  if (!canEdit) redirect("/finance");

  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [branches, currencies] = await Promise.all([
    getBranchesForUser(scopedBranchId),
    getCurrencies(),
  ]);

  const defaultValues: ExpenseFormInput = {
    branchId: expense.branchId,
    date: expense.date,
    category: expense.category,
    amountOriginal: expense.amountOriginal,
    currencyCode: expense.currencyCode,
    notes: expense.notes,
    receiptUrl: expense.receiptUrl,
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("editPageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("editPageSubtitle")}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <ExpenseForm
          mode="edit"
          expenseId={expense.id}
          branches={branches}
          currencies={currencies}
          isOwner={isOwner}
          defaultValues={defaultValues}
        />
      </FadeIn>
    </div>
  );
}
