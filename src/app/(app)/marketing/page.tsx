import { Megaphone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default async function MarketingPage() {
  const t = await getTranslations();
  return (
    <PagePlaceholder
      title={t("nav.marketing")}
      description={t("placeholder.sections.marketing")}
      icon={Megaphone}
    />
  );
}
