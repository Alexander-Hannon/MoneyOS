"use client";

import Link from "next/link";
import { CircleDollarSign, Settings } from "lucide-react";
import { BankConnectionControl } from "@/components/layout/BankConnectionControl";
import { ModeBadge } from "@/components/layout/ModeBadge";
import { useFinancialData } from "@/hooks/useFinancialData";

export function Header() {
  const fd = useFinancialData();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary ring-1 ring-primary/20">
            <CircleDollarSign className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight">
              Money<span className="text-primary">OS</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Personal finance command center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ModeBadge label={fd.modeLabel} />
          <BankConnectionControl />
          <Link
            href="/settings"
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </Link>
          <p className="hidden text-xs text-muted-foreground lg:block lg:text-sm">
            {today}
          </p>
        </div>
      </div>
    </header>
  );
}
