"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { scrollToSection } from "@/lib/scroll-nav";
import { useActionNavigation } from "@/hooks/useActionNavigation";
import type { ActionDestinationKey } from "@/lib/action-destinations";
import { cn } from "@/lib/utils";

const cardBase =
  "rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ClickableStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  badge,
  sectionId,
  destinationKey,
  className,
  layout = "horizontal",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
  badge?: string;
  sectionId?: string;
  destinationKey?: ActionDestinationKey;
  className?: string;
  layout?: "horizontal" | "vertical";
}) {
  const { navigateToKey } = useActionNavigation();
  const ariaLabel = `Go to ${label}`;

  const handleClick = () => {
    if (destinationKey) {
      navigateToKey(destinationKey);
      return;
    }
    if (sectionId) {
      scrollToSection(sectionId);
    }
  };

  if (layout === "vertical") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        className={cn(cardBase, "w-full p-4 text-left", className)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <Icon className={cn("size-4 shrink-0", accent)} />
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        {badge && (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-info/80">
            {badge}
          </p>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={cn(
        cardBase,
        "flex w-full items-center gap-3 p-4 text-left",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted",
          accent,
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold tabular-nums leading-tight">
          {value}
        </p>
        {hint && (
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        )}
        {badge && (
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-info/80">
            {badge}
          </p>
        )}
      </div>
    </button>
  );
}

export function ClickableStatusCard({
  label,
  children,
  sectionId,
  destinationKey,
  className,
}: {
  label: string;
  children: ReactNode;
  sectionId?: string;
  destinationKey?: ActionDestinationKey;
  className?: string;
}) {
  const { navigateToKey } = useActionNavigation();

  const handleClick = () => {
    if (destinationKey) {
      navigateToKey(destinationKey);
      return;
    }
    if (sectionId) {
      scrollToSection(sectionId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Go to ${label}`}
      className={cn(
        cardBase,
        "flex w-full flex-col justify-between p-4 text-left",
        className,
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </button>
  );
}
