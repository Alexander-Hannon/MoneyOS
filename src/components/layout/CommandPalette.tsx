"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarClock, PiggyBank, Repeat, Search, TrendingUp, type LucideIcon } from "lucide-react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatCurrency } from "@/lib/money-utils";
import { cn } from "@/lib/utils";
import { ALL_NAV_ITEMS } from "@/components/layout/nav-items";

type PaletteEntry = {
  id: string;
  group: "Go to" | "Bills" | "Subscriptions" | "Income" | "Spending later";
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  haystack: string;
};

const MAX_RESULTS = 40;

function score(entry: PaletteEntry, q: string): number {
  if (!q) return 1;
  const label = entry.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  if (entry.haystack.includes(q)) return 1;
  return 0;
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Mounting only while open gives every opening a fresh query and cursor.
  if (!open || typeof document === "undefined") return null;
  return <PaletteDialog onClose={onClose} />;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const fd = useFinancialData();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const entries = useMemo<PaletteEntry[]>(() => {
    const nav: PaletteEntry[] = ALL_NAV_ITEMS.map((item) => ({
      id: `nav:${item.href}`,
      group: "Go to",
      label: item.label,
      href: item.href,
      icon: item.icon,
      haystack: `${item.label} ${item.keywords ?? ""}`.toLowerCase(),
    }));
    const bills: PaletteEntry[] = fd.bills.map((b) => ({
      id: `bill:${b.id}`,
      group: "Bills",
      label: b.name,
      hint: b.amount != null ? formatCurrency(b.amount, true) : "Variable",
      href: "/bills",
      icon: CalendarClock,
      haystack: `${b.name} ${b.payeeName ?? ""} bill`.toLowerCase(),
    }));
    const subs: PaletteEntry[] = fd.subscriptions.map((s) => ({
      id: `sub:${s.id}`,
      group: "Subscriptions",
      label: s.name,
      hint: formatCurrency(s.amount, true),
      href: "/subscriptions",
      icon: Repeat,
      haystack: `${s.name} ${s.category} subscription`.toLowerCase(),
    }));
    const income: PaletteEntry[] = fd.income.map((i) => ({
      id: `income:${i.id}`,
      group: "Income",
      label: i.source,
      hint: i.expectedAmount != null ? formatCurrency(i.expectedAmount, true) : "Variable",
      href: "/income",
      icon: TrendingUp,
      haystack: `${i.source} income`.toLowerCase(),
    }));
    const planned: PaletteEntry[] = fd.spendingLater.map((p) => ({
      id: `planned:${p.id}`,
      group: "Spending later",
      label: p.title ?? p.name,
      hint: p.amount != null ? formatCurrency(p.amount, true) : undefined,
      href: "/spending-later",
      icon: PiggyBank,
      haystack: `${p.title ?? p.name} ${p.category} planned`.toLowerCase(),
    }));
    return [...nav, ...bills, ...subs, ...income, ...planned];
  }, [fd.bills, fd.subscriptions, fd.income, fd.spendingLater]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    // With no query, show navigation only; records appear once you type.
    const pool = q ? entries : entries.filter((e) => e.group === "Go to");
    return pool
      .map((e) => ({ e, s: score(e, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((x) => x.e);
  }, [entries, query]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const go = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    onClose();
    router.push(entry.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[cursor]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup: string | null = null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius)] border border-border bg-popover shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Jump to a page, bill, subscription, or income source"
            aria-label="Search MoneyOS"
            aria-controls="command-results"
            aria-activedescendant={results[cursor] ? `cmd-${results[cursor].id}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="num rounded-[3px] border border-border px-1.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <ul
          id="command-results"
          ref={listRef}
          role="listbox"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing matches “{query}”.
            </li>
          ) : (
            results.map((entry, index) => {
              const header = entry.group !== lastGroup ? entry.group : null;
              lastGroup = entry.group;
              const Icon = entry.icon;
              return (
                <li key={entry.id} role="presentation">
                  {header ? (
                    <p className="px-3 pb-1 pt-2 text-[11px] text-muted-foreground/70">
                      {header}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    id={`cmd-${entry.id}`}
                    role="option"
                    aria-selected={index === cursor}
                    data-index={index}
                    onMouseMove={() => setCursor(index)}
                    onClick={() => go(entry)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm",
                      index === cursor ? "bg-primary/10 text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className={cn("size-4", index === cursor && "text-primary")} aria-hidden />
                    <span className="flex-1 truncate">{entry.label}</span>
                    {entry.hint ? (
                      <span className="num text-xs text-muted-foreground">{entry.hint}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
