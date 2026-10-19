"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export function TaskPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AppShell title={title} description={description}>
      {children}
    </AppShell>
  );
}
