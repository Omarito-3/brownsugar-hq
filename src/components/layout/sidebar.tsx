"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/config/nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SoundToggle } from "@/components/layout/sound-toggle";
import { SignOutButton } from "@/components/layout/sign-out-button";

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  role: string;
};

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Brown Sugar <span className="text-primary">HQ</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name ?? user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.role}</p>
          </div>
          <div className="flex items-center">
            <SoundToggle />
            <ThemeToggle />
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
