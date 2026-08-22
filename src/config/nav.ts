import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Package,
  Users,
  Megaphone,
  Building2,
  Settings,
} from "lucide-react";

export type NavItem = {
  titleKey: "dashboard" | "sales" | "finance" | "stock" | "employees" | "marketing" | "management" | "settings";
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { titleKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { titleKey: "sales", href: "/sales", icon: ShoppingCart },
  { titleKey: "finance", href: "/finance", icon: Wallet },
  { titleKey: "stock", href: "/stock", icon: Package },
  { titleKey: "employees", href: "/employees", icon: Users },
  { titleKey: "marketing", href: "/marketing", icon: Megaphone },
  { titleKey: "management", href: "/management", icon: Building2 },
  { titleKey: "settings", href: "/settings", icon: Settings },
];
