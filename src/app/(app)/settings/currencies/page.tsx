import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { CurrenciesTable } from "@/components/settings/currencies-table";
import { getCurrenciesWithMeta } from "@/lib/queries/shared";

export default async function CurrenciesSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/settings");

  const currencies = await getCurrenciesWithMeta();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">Currencies</h1>
        <p className="mt-1 text-muted-foreground">Manage exchange rates used across the app.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <CurrenciesTable currencies={currencies} />
      </FadeIn>
    </div>
  );
}
