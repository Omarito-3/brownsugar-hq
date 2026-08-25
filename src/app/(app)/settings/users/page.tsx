import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { UsersManager } from "@/components/settings/users-manager";
import { getUsersManaged } from "@/lib/queries/users";
import { getBranchesForUser } from "@/lib/queries/shared";

export default async function UsersSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/settings");

  const t = await getTranslations("users");
  const tSettings = await getTranslations("settings");

  const [users, branches] = await Promise.all([getUsersManaged(), getBranchesForUser()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <FadeIn className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {tSettings("title")}
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <UsersManager users={users} branches={branches} currentUserId={session.user.id} />
      </FadeIn>
    </div>
  );
}
