"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarClock,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; id: string; icon: LucideIcon };

const items: NavItem[] = [
  { label: "Dashboard", id: "dashboard", icon: LayoutDashboard },
  { label: "Bills", id: "bills", icon: CalendarClock },
  { label: "Income", id: "income", icon: TrendingUp },
  { label: "Subscriptions", id: "subscriptions", icon: Repeat },
  { label: "Spending", id: "spending", icon: Wallet },
  { label: "Alerts", id: "alerts", icon: Bell },
  { label: "Spending Later", id: "spending-later", icon: PiggyBank },
];

export function Nav() {
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-2 sm:px-6">
        <ul className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(({ label, id, icon: Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active === id ? "true" : undefined}
                onClick={() => setActive(id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors",
                  active === id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
