"use client";

import { useEffect } from "react";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { AppShell } from "@/components/layout/AppShell";
import { scrollToSection } from "@/lib/scroll-nav";

export function SettingsPageClient() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 100);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppShell width="narrow">
      <SettingsPanel />
    </AppShell>
  );
}
