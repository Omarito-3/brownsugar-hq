import { LayoutDashboard } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard"
      description="A daily overview across all branches."
      icon={LayoutDashboard}
    />
  );
}
