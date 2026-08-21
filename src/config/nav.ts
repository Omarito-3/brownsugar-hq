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
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sales", href: "/sales", icon: ShoppingCart },
  { title: "Finance", href: "/finance", icon: Wallet },
  { title: "Stock", href: "/stock", icon: Package },
  { title: "Employees", href: "/employees", icon: Users },
  { title: "Marketing", href: "/marketing", icon: Megaphone },
  { title: "Management", href: "/management", icon: Building2 },
  { title: "Settings", href: "/settings", icon: Settings },
];
