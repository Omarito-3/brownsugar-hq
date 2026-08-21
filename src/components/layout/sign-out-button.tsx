"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Sign out"
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
      Sign out
    </Button>
  );
}
