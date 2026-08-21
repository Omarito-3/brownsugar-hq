import { Users } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function EmployeesPage() {
  return (
    <PagePlaceholder
      title="Employees"
      description="Staff, roles, and branch assignments."
      icon={Users}
    />
  );
}
