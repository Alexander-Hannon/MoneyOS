"use client";

import Link from "next/link";
import { useMoneyData } from "@/lib/storage/store";
import { useUserStatus } from "@/hooks/useUserStatus";

/** Shown to signed-out visitors: everything on screen is sample data. */
export function PreviewBanner() {
  const money = useMoneyData();
  const { status } = useUserStatus();
  if (money.dataMode !== "preview") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-info/30 bg-info/10 px-4 py-2 text-sm sm:px-6">
      <p>
        <span className="font-medium text-info">Demo preview.</span>{" "}
        <span className="text-muted-foreground">
          Sample data only. Changes here aren’t saved.
        </span>
      </p>
      {status.authConfigured ? (
        <div className="flex gap-2">
          <Link href="/sign-up" className="rounded-[var(--radius-sm)] bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            Create account
          </Link>
          <Link href="/sign-in" className="rounded-[var(--radius-sm)] border border-border px-3 py-1 text-xs">
            Sign in
          </Link>
        </div>
      ) : null}
    </div>
  );
}
