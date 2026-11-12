"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { PreviewBanner } from "@/components/auth/PreviewBanner";
import { LegacyDataImport } from "@/components/auth/LegacyDataImport";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  description,
  actions,
  width = "default",
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  width?: "default" | "narrow";
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card/40 lg:block">
        <Sidebar />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-[var(--radius-sm)] p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="mos-grid flex min-w-0 flex-1 flex-col">
        <Header
          onOpenMenu={() => setMenuOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <PreviewBanner />
        <main
          className={cn(
            "mx-auto w-full min-w-0 flex-1 space-y-6 px-4 py-6 sm:px-6 lg:py-8",
            width === "narrow" ? "max-w-3xl" : "max-w-7xl",
          )}
        >
          <LegacyDataImport />
          {title ? (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {actions}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
