"use client";

import { useEffect } from "react";
import { scrollToSection } from "@/lib/scroll-nav";

export function DashboardHashScroll() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const timer = window.setTimeout(() => scrollToSection(hash), 100);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
