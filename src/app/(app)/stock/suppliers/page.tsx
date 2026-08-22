import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { SuppliersManager } from "@/components/stock/suppliers-manager";
import { getSuppliersManaged } from "@/lib/queries/stock";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
    redirect("/stock");
  }

  const suppliers = await getSuppliersManaged();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">Suppliers</h1>
        <p className="mt-1 text-muted-foreground">Manage suppliers used for stock purchases.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <SuppliersManager suppliers={suppliers} />
      </FadeIn>
    </div>
  );
}
