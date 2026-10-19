"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buildMoneyBriefInput } from "@/lib/ai/build-brief-input";
import { AI_DISCLAIMER } from "@/lib/ai/money-agent-prompts";
import type { MoneyBriefOutput } from "@/lib/ai/types";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatCurrency, toneForDashboardStatus } from "@/lib/money-utils";
import type { DashboardStatus } from "@/types/money";

function ProgressBar({
  label,
  value,
  max,
  tone = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  tone?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="num">
          {formatCurrency(value)} / {formatCurrency(max)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SimpleBriefView({ brief }: { brief: MoneyBriefOutput }) {
  const vs = brief.visualSnapshot;
  const coverageMax = Math.max(vs.cashAvailable + vs.income14, vs.billsDue14, 1);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          label={brief.statusLabel}
          tone={toneForDashboardStatus(brief.statusLabel as DashboardStatus)}
          className="px-3 py-1 text-sm"
        />
        <StatusBadge label="Review required" tone="warning" />
        {brief.mock && <StatusBadge label="Demo AI response" tone="info" />}
      </div>

      {brief.modeNotice && (
        <p className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
          {brief.modeNotice}
        </p>
      )}

      <section>
        <h3 className="text-xs font-medium text-muted-foreground">
          Top 3 things that matter
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {brief.topThreeThings.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-[10px] font-medium text-destructive">
            One main risk
          </p>
          <p className="mt-1 text-sm">{brief.mainRisk}</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] font-medium text-primary">
            Best next action
          </p>
          <p className="mt-1 text-sm font-medium">{brief.bestNextAction}</p>
        </div>
      </div>

      <section className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          Visual snapshot
        </h3>
        <div className="mt-3 space-y-3">
          <ProgressBar
            label="Cash vs bills due (14d)"
            value={vs.cashAvailable}
            max={coverageMax}
            tone="bg-success"
          />
          <ProgressBar
            label="Income vs spending (monthly)"
            value={vs.income14}
            max={Math.max(vs.monthlySpending, vs.income14, 1)}
            tone="bg-info"
          />
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-[var(--radius-md)] border border-border bg-card p-2">
              <p className="text-muted-foreground">Review items</p>
              <p className="mt-0.5 text-lg font-medium num">
                {vs.reviewItemsCount}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-card p-2">
              <p className="text-muted-foreground">Upcoming obligations</p>
              <p className="mt-0.5 text-lg font-medium num">
                {vs.upcomingObligationsCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        {AI_DISCLAIMER} MoneyOS does not make final financial decisions.
      </p>
    </div>
  );
}

export function MoneyAgentBrief({ compact = false }: { compact?: boolean }) {
  const fd = useFinancialData();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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
      setShowDetails(false);
      if (compact) setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate brief.");
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <>
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
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Money Agent Brief"
          description={AI_DISCLAIMER}
          className="sm:max-w-xl"
        >
          {brief && <SimpleBriefView brief={brief} />}
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" />
              Money Agent Brief
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Short, visual summary — AI guidance for review only.
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
            Generate brief
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        {brief && (
          <>
            <SimpleBriefView brief={brief} />
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 gap-1.5 text-xs"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              {showDetails ? "Hide details" : "Show details"}
            </Button>
            {showDetails && (
              <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Full snapshot
                  </h3>
                  <p className="mt-1 text-muted-foreground">{brief.snapshot}</p>
                </section>
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Top risks
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {brief.topRisks.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Opportunities
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    {brief.opportunities.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
