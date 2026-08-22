import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { ItemsManager } from "@/components/stock/items-manager";
import { getStockItemsManaged } from "@/lib/queries/stock";

export default async function StockItemsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
    redirect("/stock");
  }

  const items = await getStockItemsManaged();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">Stock Items</h1>
        <p className="mt-1 text-muted-foreground">Manage the items tracked across branches.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <ItemsManager items={items} />
      </FadeIn>
    </div>
  );
}
