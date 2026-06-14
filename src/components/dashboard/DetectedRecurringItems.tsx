"use client";

import { Repeat2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useMoneyData } from "@/lib/storage/store";
import { formatCurrency } from "@/lib/money-utils";
import { useToast } from "@/components/ui/toast";
import type { RecurringSuggestion } from "@/types/actions";

function billDraftFromSuggestion(suggestion: RecurringSuggestion) {
  return {
    name: suggestion.name,
    amount: suggestion.detectedAmount,
    amountType: "fixed" as const,
    dueDate: new Date().toISOString().slice(0, 10),
    frequency: "monthly" as const,
    autopay: false,
    paidFrom: "Unassigned",
    status: "review" as const,
    notes: `Detected from transactions (${suggestion.cadence})`,
  };
}

function subscriptionDraftFromSuggestion(suggestion: RecurringSuggestion) {
  return {
    name: suggestion.name,
    amount: suggestion.detectedAmount,
    frequency: "monthly" as const,
    category: suggestion.categoryGuess,
    status: "review" as const,
    notes: `Detected from transactions (${suggestion.cadence})`,
  };
}

function incomeDraftFromSuggestion(suggestion: RecurringSuggestion) {
  return {
    source: suggestion.name,
    expectedAmount: suggestion.detectedAmount,
    amountType: "fixed" as const,
    frequency: "monthly" as const,
    reliability: "medium" as const,
    active: true,
  };
}

export function DetectedRecurringItems() {
  const { recurringSuggestions } = useFinancialData();
  const {
    addBill,
    addSubscription,
    addIncome,
    dismissRecurringSuggestion,
  } = useMoneyData();
  const toast = useToast();

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Repeat2}
          title="Detected Recurring Items"
          description="Suggestions from transaction history — nothing is added automatically"
          meta={`${recurringSuggestions.length} suggestion${recurringSuggestions.length === 1 ? "" : "s"}`}
        />

        {recurringSuggestions.length === 0 ? (
          <EmptyState
            icon={Repeat2}
            title="No recurring patterns detected yet"
            description="Connect Plaid sandbox or load demo data to see suggestions from transactions."
          />
        ) : (
          <ul className="space-y-2">
            {recurringSuggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3.5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{suggestion.name}</p>
                      <StatusBadge
                        label={suggestion.confidence}
                        tone={
                          suggestion.confidence === "high"
                            ? "success"
                            : suggestion.confidence === "medium"
                              ? "warning"
                              : "neutral"
                        }
                      />
                      <StatusBadge label={suggestion.typeGuess} tone="info" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(suggestion.detectedAmount)} ·{" "}
                      {suggestion.cadence} · {suggestion.categoryGuess}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {suggestion.suggestedAction}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(suggestion.typeGuess === "bill" ||
                      suggestion.typeGuess === "review") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          addBill(billDraftFromSuggestion(suggestion));
                          dismissRecurringSuggestion(suggestion.id);
                          toast(`Added ${suggestion.name} as bill`);
                        }}
                      >
                        Add as bill
                      </Button>
                    )}
                    {(suggestion.typeGuess === "subscription" ||
                      suggestion.typeGuess === "review") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          addSubscription(
                            subscriptionDraftFromSuggestion(suggestion),
                          );
                          dismissRecurringSuggestion(suggestion.id);
                          toast(`Added ${suggestion.name} as subscription`);
                        }}
                      >
                        Add as subscription
                      </Button>
                    )}
                    {suggestion.typeGuess === "income" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          addIncome(incomeDraftFromSuggestion(suggestion));
                          dismissRecurringSuggestion(suggestion.id);
                          toast(`Added ${suggestion.name} as income`);
                        }}
                      >
                        Add as income
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        dismissRecurringSuggestion(suggestion.id);
                        toast("Suggestion ignored");
                      }}
                    >
                      Ignore
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
