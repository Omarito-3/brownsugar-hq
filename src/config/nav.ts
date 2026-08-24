import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Package,
  Users,
  Megaphone,
  Building2,
  Calculator,
  Settings,
} from "lucide-react";

export type NavItem = {
  titleKey:
    | "dashboard"
    | "sales"
    | "finance"
    | "stock"
    | "employees"
    | "marketing"
    | "management"
    | "tools"
    | "settings";
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
  { titleKey: "tools", href: "/tools/calculator", icon: Calculator },
  { titleKey: "settings", href: "/settings", icon: Settings },
];
