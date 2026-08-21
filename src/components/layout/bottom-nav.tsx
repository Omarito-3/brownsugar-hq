"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/config/nav";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch overflow-x-auto border-t border-border bg-sidebar md:hidden">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 px-2 text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-sidebar-foreground/70"
            )}
          >
            <Icon className="size-5" />
            <span className="whitespace-nowrap">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
