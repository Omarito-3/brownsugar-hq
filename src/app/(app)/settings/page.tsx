import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Coins, Settings } from "lucide-react";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isOwner = session.user.role === "OWNER";

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Account, appearance, and sound preferences.</p>
      </FadeIn>

      {isOwner && (
        <FadeIn delay={0.05}>
          <Link href="/settings/currencies">
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Coins className="size-6" />
                  </span>
                  Currencies
                </CardTitle>
                <ChevronRight className="size-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage exchange rates used across sales and expenses.
                </p>
              </CardContent>
            </Card>
          </Link>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings className="size-6" />
              </span>
              More coming soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Account, appearance, and sound preferences will land here next.
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
