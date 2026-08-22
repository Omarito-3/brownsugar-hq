import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default async function EmployeesPage() {
  const t = await getTranslations();
  return (
    <PagePlaceholder
      title={t("nav.employees")}
      description={t("placeholder.sections.employees")}
      icon={Users}
    />
  );
}
