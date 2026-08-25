import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Coins, Settings, UserCircle, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

function SettingsLinkCard({
  href,
  icon: Icon,
  title,
  description,
  delay,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <FadeIn delay={delay}>
      <Link href={href}>
        <Card className="transition-colors hover:bg-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-3 text-xl">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
              {title}
            </CardTitle>
            <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      </Link>
    </FadeIn>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isOwner = session.user.role === "OWNER";
  const t = await getTranslations("settings");

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </FadeIn>

      <SettingsLinkCard
        href="/settings/account"
        icon={UserCircle}
        title={t("account")}
        description={t("accountDesc")}
        delay={0.05}
      />

      {isOwner && (
        <>
          <SettingsLinkCard
            href="/settings/users"
            icon={Users}
            title={t("users")}
            description={t("usersDesc")}
            delay={0.1}
          />
          <SettingsLinkCard
            href="/settings/currencies"
            icon={Coins}
            title={t("currencies")}
            description={t("currenciesDesc")}
            delay={0.15}
          />
        </>
      )}

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings className="size-6" />
              </span>
              {t("moreComingSoon")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t("moreComingSoonDesc")}</p>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
