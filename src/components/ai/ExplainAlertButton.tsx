"use client";

import { useState } from "react";
import { Loader2, MessageCircleQuestion } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AI_DISCLAIMER } from "@/lib/ai/money-agent-prompts";
import type { ExplainAlertOutput } from "@/lib/ai/types";
import { useFinancialData } from "@/hooks/useFinancialData";
import type { Alert } from "@/types/money";

export function ExplainAlertButton({ alert }: { alert: Alert }) {
  const fd = useFinancialData();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainAlertOutput | null>(null);

  const explain = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          category: alert.category,
          suggestedAction: alert.suggestedAction,
          contextSummary: {
            dataSource: fd.dataSourceBadge,
            cashAvailable: fd.dashboardSummary.cashAvailable,
            billsDue14Days: fd.dashboardSummary.billsDue14.total,
            reviewItemsCount:
              fd.dashboardSummary.manualReviewItems +
              fd.dashboardSummary.transactionReviewCount,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Could not explain alert.");
      }
      setResult(data as ExplainAlertOutput);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not explain alert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => void explain()}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <MessageCircleQuestion className="size-3.5" />
        )}
        Explain
      </button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Alert explanation"
        description={AI_DISCLAIMER}
      >
        {result && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {result.mock && (
                <StatusBadge label="Demo AI response" tone="info" />
              )}
              <StatusBadge label="Review required" tone="warning" />
            </div>

            <section>
              <h3 className="text-xs font-medium text-muted-foreground">
                Plain English
              </h3>
              <p className="mt-1">{result.plainEnglishExplanation}</p>
            </section>

            <section>
              <h3 className="text-xs font-medium text-muted-foreground">
                Why it matters
              </h3>
              <p className="mt-1 text-muted-foreground">{result.whyItMatters}</p>
            </section>

            <section>
              <h3 className="text-xs font-medium text-muted-foreground">
                Suggested review steps
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                {result.suggestedReviewSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-medium text-muted-foreground">
                What not to do
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-destructive/90">
                {result.whatNotToDo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              {AI_DISCLAIMER}
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
