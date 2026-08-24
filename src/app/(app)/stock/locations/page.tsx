import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { LocationsManager } from "@/components/stock/locations-manager";
import { getStockLocationsManaged } from "@/lib/queries/stock";

export default async function StockLocationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/stock");

  const t = await getTranslations("stock");
  const locations = await getStockLocationsManaged();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <FadeIn className="space-y-4">
        <Link
          href="/stock"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("title")}
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("locationsPage.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("locationsPage.subtitle")}</p>
        </div>
      </FadeIn>
      <FadeIn delay={0.05}>
        <LocationsManager locations={locations} />
      </FadeIn>
    </div>
  );
}
