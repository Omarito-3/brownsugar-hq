import { Wallet } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function FinancePage() {
  return (
    <PagePlaceholder
      title="Finance"
      description="Expenses, currencies, and branch profitability."
      icon={Wallet}
    />
  );
}
