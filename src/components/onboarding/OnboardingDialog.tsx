"use client";

import { Landmark, Rocket, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useAppMode } from "@/context/AppModeProvider";

export function OnboardingDialog() {
  const { showOnboarding, completeOnboarding } = useAppMode();

  if (!showOnboarding) return null;

  return (
    <Dialog
      open={showOnboarding}
      onClose={() => {}}
      title="Set up MoneyOS"
      description="Choose how you want to start. You can change this later in Settings."
      className="sm:max-w-lg"
    >
      <div className="space-y-3">
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
          MoneyOS by Apalym · Development / Sandbox mode. No real bank
          connections in this build.
        </p>
      </div>
    </Dialog>
  );
}
