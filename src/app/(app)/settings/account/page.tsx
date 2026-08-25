import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { ProfileForm, PasswordForm } from "@/components/settings/account-forms";
import { getOwnProfile } from "@/lib/queries/users";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("account");
  const tSettings = await getTranslations("settings");
  const profile = await getOwnProfile(session.user.id);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
        <ProfileForm profile={profile} />
      </FadeIn>

      <FadeIn delay={0.1}>
        <PasswordForm />
      </FadeIn>
    </div>
  );
}
