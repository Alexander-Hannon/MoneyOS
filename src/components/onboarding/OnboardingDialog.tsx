"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, LogIn, Rocket, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useAppMode } from "@/context/AppModeProvider";
import { useUserStatus } from "@/hooks/useUserStatus";

export function OnboardingDialog() {
  const { showOnboarding, completeOnboarding, dismissOnboarding } = useAppMode();
  const { status, loading } = useUserStatus();
  const pathname = usePathname();
  const onAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  // Signed-in account data is canonical, so a new browser should load it,
  // not ask to start fresh or load demo data over it.
  const accountBacked = status.signedIn && status.databaseConfigured;
  const offerSignIn = status.authConfigured && !status.signedIn;

  useEffect(() => {
    if (showOnboarding && !loading && accountBacked) dismissOnboarding();
  }, [showOnboarding, loading, accountBacked, dismissOnboarding]);

  if (!showOnboarding || loading || accountBacked || onAuthPage) return null;

  return (
    <Dialog
      open={showOnboarding}
      onClose={() => {}}
      title="Set up MoneyOS"
      description="Choose how you want to start. You can change this later in Settings."
      className="sm:max-w-lg"
    >
      <div className="space-y-3">
        {offerSignIn ? (
          <Link
            href="/sign-in"
            className="flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/10"
          >
            <LogIn className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Sign in</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Load your saved MoneyOS data and linked banks on this device.
              </p>
            </div>
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => completeOnboarding("fresh")}
          className="flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-border bg-muted/20 p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          <Rocket className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Start fresh</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Empty bills, income, subscriptions, and alerts. Build your own
              system from scratch.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => completeOnboarding("demo")}
          className="flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-border bg-muted/20 p-4 text-left transition-colors hover:border-info/30 hover:bg-info/5"
        >
          <Sparkles className="mt-0.5 size-5 shrink-0 text-info" />
          <div>
            <p className="font-medium">Load demo data</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generic sample bills, income, and alerts for exploring MoneyOS.
              Clearly labeled as demo.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => completeOnboarding("connect_sandbox")}
          className="flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-border bg-muted/20 p-4 text-left transition-colors hover:border-success/30 hover:bg-success/5"
        >
          <Landmark className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="font-medium">Connect sandbox bank</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Start fresh, then open Plaid sandbox Link (test credentials only —
              not live banks).
            </p>
          </div>
        </button>

        <p className="pt-1 text-[11px] text-muted-foreground">
          {offerSignIn
            ? "Already use MoneyOS on another device? Sign in instead of starting fresh, so your data loads here."
            : "Demo and sandbox data are always labeled and kept separate from real bank data."}
        </p>
      </div>
    </Dialog>
  );
}
