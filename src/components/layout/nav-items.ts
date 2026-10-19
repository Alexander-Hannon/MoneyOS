import {
  Activity,
  CalendarClock,
  CalendarRange,
  Landmark,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  Repeat,
  RotateCw,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Extra words the command palette matches on. */
  keywords?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Command", href: "/", icon: LayoutDashboard, keywords: "home dashboard overview" },
      { label: "Runway", href: "/runway", icon: Activity, keywords: "forecast projection cashflow safe to spend" },
      { label: "Weekly review", href: "/weekly-review", icon: CalendarRange, keywords: "review week" },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Cash", href: "/cash", icon: Landmark, keywords: "accounts balances checking savings" },
      { label: "Spending", href: "/spending", icon: Wallet, keywords: "transactions categories" },
      { label: "Income", href: "/income", icon: TrendingUp, keywords: "paycheck salary deposits" },
    ],
  },
  {
    label: "Commitments",
    items: [
      { label: "Bills", href: "/bills", icon: CalendarClock, keywords: "due rent utilities" },
      { label: "Subscriptions", href: "/subscriptions", icon: Repeat, keywords: "trials renewals" },
      { label: "Recurring", href: "/recurring", icon: RotateCw, keywords: "detected recurring" },
      { label: "Spending later", href: "/spending-later", icon: PiggyBank, keywords: "planned goals savings" },
    ],
  },
];

export const ACTION_CENTER_ITEM: NavItem = {
  label: "Action center",
  href: "/action-center",
  icon: ListChecks,
  keywords: "todo tasks alerts review",
};

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
  keywords: "preferences bank connection export",
};

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  ACTION_CENTER_ITEM,
  SETTINGS_ITEM,
];

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
