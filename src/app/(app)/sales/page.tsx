import { ShoppingCart } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function SalesPage() {
  return (
    <PagePlaceholder
      title="Sales"
      description="Daily sales entries and per-product breakdowns."
      icon={ShoppingCart}
    />
  );
}
