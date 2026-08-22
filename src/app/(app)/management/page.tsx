import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default async function ManagementPage() {
  const t = await getTranslations();
  return (
    <PagePlaceholder
      title={t("nav.management")}
      description={t("placeholder.sections.management")}
      icon={Building2}
    />
  );
}
