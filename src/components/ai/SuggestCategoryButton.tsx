"use client";

import { useState } from "react";
import { Loader2, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AI_DISCLAIMER } from "@/lib/ai/money-agent-prompts";
import type { ClassifyTransactionOutput } from "@/lib/ai/types";
import type { MoneyTransaction, TransactionCategory } from "@/types/transactions";

export function SuggestCategoryButton({
  transaction,
  onApprove,
}: {
  transaction: MoneyTransaction;
  onApprove: (category: TransactionCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyTransactionOutput | null>(null);

  const suggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/classify-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName: transaction.merchantName,
          description: transaction.description,
          amount: transaction.amount,
          currentCategory: transaction.category,
          date: transaction.date,
          direction: transaction.amount >= 0 ? "inflow" : "outflow",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Could not suggest category.");
      }
      setResult(data as ClassifyTransactionOutput);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not suggest category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => void suggest()}
        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Tags className="size-3" />
        )}
        Suggest
      </button>
      {error && (
        <span className="ml-1 text-[10px] text-destructive">{error}</span>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Suggested category"
        description={AI_DISCLAIMER}
      >
        {result && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {result.mock && (
                <StatusBadge label="Demo AI response" tone="info" />
              )}
              <StatusBadge label={`${result.confidence} confidence`} tone="neutral" />
              <StatusBadge label="Review required" tone="warning" />
            </div>

            <p>
              <span className="text-muted-foreground">Merchant:</span>{" "}
              {transaction.merchantName}
            </p>
            <p>
              <span className="text-muted-foreground">Suggested:</span>{" "}
              <strong>{result.suggestedCategory}</strong>
            </p>
            <p className="text-muted-foreground">{result.reason}</p>
            <p className="text-xs text-muted-foreground">
              Count as spending:{" "}
              {result.shouldCountAsSpending ? "Yes (if approved)" : "No"}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  onApprove(result.suggestedCategory);
                  setOpen(false);
                }}
              >
                Approve suggestion (this session)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Dismiss
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {AI_DISCLAIMER} Category changes apply to this browser session
              only until transaction editing is added.
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
