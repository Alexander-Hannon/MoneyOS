"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { scrollToSection } from "@/lib/scroll-nav";

export function SettingsPageClient() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 100);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-primary hover:underline">
          ← Back to MoneyOS
        </Link>
      </p>
      <div className="mt-4">
        <SettingsPanel />
      </div>
    </main>
  );
}
