"use client";

import { Menu, Search } from "lucide-react";
import { AuthHeaderControls } from "@/components/auth/AuthHeaderControls";
import { BankConnectionControl } from "@/components/layout/BankConnectionControl";
import { ModeBadge } from "@/components/layout/ModeBadge";
import { useFinancialData } from "@/hooks/useFinancialData";
import { RefreshMoneyOSDataButton } from "@/components/sync/RefreshMoneyOSDataButton";

export function Header({
  onOpenMenu,
  onOpenPalette,
}: {
  onOpenMenu: () => void;
  onOpenPalette: () => void;
}) {
  const fd = useFinancialData();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground hover:text-foreground lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Search MoneyOS"
          className="flex h-8 min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-card/60 px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex-1 sm:max-w-xs sm:px-3"
        >
          <Search className="size-3.5 shrink-0" aria-hidden />
          <span className="hidden flex-1 truncate sm:inline">Search MoneyOS</span>
          <kbd className="num hidden rounded-[3px] border border-border px-1 text-[10px] sm:inline">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <p className="num hidden text-xs text-muted-foreground xl:block">{today}</p>
          <ModeBadge label={fd.modeLabel} />
          <RefreshMoneyOSDataButton className="hidden sm:inline-flex" />
          <BankConnectionControl />
          <AuthHeaderControls />
        </div>
      </div>
    </header>
  );
}
