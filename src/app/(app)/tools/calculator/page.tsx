import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { getBranchScope } from "@/lib/permissions";
import { FadeIn } from "@/components/motion/fade-in";
import { CalculatorTabs } from "@/components/tools/calculator-tabs";
import { getProductsForCalculator } from "@/lib/queries/tools";
import { getBranchesForUser, getCurrencies } from "@/lib/queries/shared";

export default async function CalculatorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("tools");
  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  const [products, branches, currencies] = await Promise.all([
    getProductsForCalculator(),
    getBranchesForUser(scopedBranchId),
    getCurrencies(),
  ]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("calculatorTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("calculatorSubtitle")}</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <CalculatorTabs products={products} branches={branches} currencies={currencies} />
      </FadeIn>
    </div>
  );
}
