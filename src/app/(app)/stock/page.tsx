import { Package } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function StockPage() {
  return (
    <PagePlaceholder
      title="Stock"
      description="Product availability and pricing per branch."
      icon={Package}
    />
  );
}
