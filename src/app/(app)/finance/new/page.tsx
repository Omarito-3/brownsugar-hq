import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { ExpenseForm } from "@/components/finance/expense-form";
import { FadeIn } from "@/components/motion/fade-in";
import { getBranchesForUser, getCurrencies } from "@/lib/queries/shared";
import { todayDateKey } from "@/lib/format";
import type { ExpenseFormInput } from "@/lib/validations/finance";

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("finance");
  const isOwner = session.user.role === "OWNER";
  const scopedBranchId = isOwner ? undefined : (session.user.branchId ?? undefined);

  const [branches, currencies] = await Promise.all([
    getBranchesForUser(scopedBranchId),
    getCurrencies(),
  ]);

  const defaultValues: ExpenseFormInput = {
    branchId: isOwner ? "" : (branches[0]?.id ?? ""),
    date: todayDateKey(),
    category: "OTHER",
    amountOriginal: "",
    currencyCode: "ILS",
    notes: "",
    receiptUrl: "",
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("newPageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("newPageSubtitle")}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <ExpenseForm
          mode="create"
          branches={branches}
          currencies={currencies}
          isOwner={isOwner}
          defaultValues={defaultValues}
        />
      </FadeIn>
    </div>
  );
}
