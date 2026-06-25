"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-4 px-4 py-6 sm:px-6">
        <div>
          <Link
            href="/"
            className="text-sm text-primary hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
