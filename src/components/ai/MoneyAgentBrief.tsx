"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buildMoneyBriefInput } from "@/lib/ai/build-brief-input";
import { AI_DISCLAIMER } from "@/lib/ai/money-agent-prompts";
import type { MoneyBriefOutput } from "@/lib/ai/types";
import { useFinancialData } from "@/hooks/useFinancialData";

export function MoneyAgentBrief({ compact = false }: { compact?: boolean }) {
  const fd = useFinancialData();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<MoneyBriefOutput | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/money-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMoneyBriefInput(fd)),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Could not generate brief.");
      }
      setBrief(data as MoneyBriefOutput);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate brief.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {compact ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => void generate()}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Generate brief
        </Button>
      ) : (
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" />
                Money Agent Brief
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                AI summary of your current financial picture — recommendations
                only.
              </p>
            </div>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => void generate()}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate Money Agent Brief
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Money Agent Brief"
        description={AI_DISCLAIMER}
        className="sm:max-w-xl"
      >
        {brief && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {brief.mock && (
                <StatusBadge label="Demo AI response" tone="info" />
              )}
              <StatusBadge label="Review required" tone="warning" />
            </div>

            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Snapshot
              </h3>
              <p className="mt-1 text-foreground">{brief.snapshot}</p>
            </section>

            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top risks
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                {brief.topRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Opportunities
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                {brief.opportunities.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-primary">
                Recommended next action (review)
              </h3>
              <p className="mt-1 font-medium">{brief.recommendedNextAction}</p>
            </section>

            {brief.reviewRequiredItems.length > 0 && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Review required items
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {brief.reviewRequiredItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Automation ideas
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                {brief.automationIdeas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </section>

            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              {AI_DISCLAIMER} MoneyOS does not move money or execute trades.
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
