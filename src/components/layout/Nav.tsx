"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarRange,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  Repeat,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; id?: string; href?: string; icon: LucideIcon };

const items: NavItem[] = [
  { label: "Dashboard", id: "dashboard", icon: LayoutDashboard },
  { label: "Weekly Review", href: "/weekly-review", icon: CalendarRange },
  { label: "Bills", id: "bills", icon: CalendarClock },
  { label: "Income", id: "income", icon: TrendingUp },
  { label: "Subscriptions", href: "/subscriptions", icon: Repeat },
  { label: "Spending", href: "/spending", icon: Wallet },
  { label: "Action Center", id: "action-center", icon: ListChecks },
  { label: "Alerts", id: "alerts", icon: Bell },
  { label: "Spending Later", id: "spending-later", icon: PiggyBank },
];

export function Nav() {
  const [active, setActive] = useState("dashboard");
  // Suppress scroll-spy updates briefly after a click so the clicked item
  // (e.g. Subscriptions, which shares a row with Income) stays highlighted.
  const suppressSpy = useRef(false);

  useEffect(() => {
    const els = items
      .filter((i) => i.id)
      .map((i) => document.getElementById(i.id!))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressSpy.current) return;
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

  const handleClick = (e: React.MouseEvent, id: string) => {
    // Scroll programmatically so re-clicking the active section (or a hash that
    // already matches the URL) still navigates instead of doing nothing.
    e.preventDefault();
    suppressSpy.current = true;
    window.setTimeout(() => {
      suppressSpy.current = false;
    }, 800);
    setActive(id);
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-2 sm:px-6">
        <ul className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(({ label, id, href, icon: Icon }) => (
            <li key={label}>
              {href ? (
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors",
                    "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ) : (
                <a
                  href={`#${id}`}
                  aria-current={active === id ? "true" : undefined}
                  onClick={(e) => handleClick(e, id!)}
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
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
