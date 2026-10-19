"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFinancialData } from "@/hooks/useFinancialData";
import { cn } from "@/lib/utils";
import {
  ACTION_CENTER_ITEM,
  NAV_GROUPS,
  SETTINGS_ITEM,
  isNavItemActive,
  type NavItem,
} from "@/components/layout/nav-items";

const MODE_DOT: Record<string, string> = {
  "Demo Mode": "bg-info",
  "Local User Data": "bg-muted-foreground",
  "Plaid Sandbox": "bg-success",
  "Personal Live": "bg-warning",
};

function NavLink({
  item,
  pathname,
  count,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  count?: number;
  onNavigate?: () => void;
}) {
  const active = isNavItemActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1.5 -left-3 w-[2px] rounded-full bg-primary"
        />
      ) : null}
      <Icon
        className={cn("size-4 shrink-0", active ? "text-primary" : "opacity-80")}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {count ? (
        <span className="num rounded-[3px] bg-warning/15 px-1.5 text-[11px] leading-5 text-warning">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const fd = useFinancialData();
  const actionCount = fd.actionItems.length;

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-14 items-center gap-2.5 border-b border-border px-5"
      >
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-[4px] border border-primary/50 bg-primary/10"
        >
          <span className="size-2 rounded-[1px] bg-primary" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">MoneyOS</span>
      </Link>

      <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="border-t border-border pt-4">
          <NavLink
            item={ACTION_CENTER_ITEM}
            pathname={pathname}
            count={actionCount}
            onNavigate={onNavigate}
          />
        </div>
      </nav>

      <div className="space-y-2 border-t border-border px-3 py-3">
        <NavLink item={SETTINGS_ITEM} pathname={pathname} onNavigate={onNavigate} />
        <div className="flex items-center gap-2 px-2.5 text-[11px] text-muted-foreground">
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", MODE_DOT[fd.modeLabel] ?? "bg-muted-foreground")}
          />
          <span>Data: {fd.modeLabel}</span>
        </div>
      </div>
    </div>
  );
}
