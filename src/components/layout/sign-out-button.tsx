"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("common");

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("signOut")}
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="size-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="size-4" />
      {t("signOut")}
    </Button>
  );
}
