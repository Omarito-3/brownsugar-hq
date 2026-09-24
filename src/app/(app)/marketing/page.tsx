import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { getBranchScope } from "@/lib/permissions";
import { FadeIn } from "@/components/motion/fade-in";
import { CampaignsList } from "@/components/marketing/campaigns-list";
import { ExperimentsTable } from "@/components/marketing/experiments-table";
import { FeedbackLog } from "@/components/marketing/feedback-log";
import { getBranchesForUser } from "@/lib/queries/shared";
import { getCampaignsWithImpact, getMenuExperiments, getFeedback } from "@/lib/queries/marketing";

export default async function MarketingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "STAFF") redirect("/dashboard");

  const t = await getTranslations("marketing");
  const isOwner = session.user.role === "OWNER";
  // Fails closed: a MANAGER/STAFF with no branch gets no branch-scoped data.
  const scope = getBranchScope(session.user);
  if (scope.kind === "none") return <NoBranchAssigned />;
  const scopedBranchId = scope.branchId;

  const [campaigns, experiments, feedback, branches] = await Promise.all([
    getCampaignsWithImpact(scopedBranchId),
    getMenuExperiments(scopedBranchId),
    getFeedback(scopedBranchId),
    getBranchesForUser(scopedBranchId),
  ]);

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <CampaignsList
          campaigns={campaigns}
          branches={branches}
          isOwner={isOwner}
          defaultBranchId={scopedBranchId ?? ""}
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <ExperimentsTable
          experiments={experiments}
          branches={branches}
          isOwner={isOwner}
          defaultBranchId={scopedBranchId ?? ""}
        />
      </FadeIn>

      <FadeIn delay={0.15}>
        <FeedbackLog
          feedback={feedback}
          branches={branches}
          isOwner={isOwner}
          defaultBranchId={scopedBranchId ?? ""}
        />
      </FadeIn>
    </div>
  );
}
