"use client";

import { useState } from "react";
import { formatCurrency, type AgentReview } from "@/lib/finance";

export function MoneyAgentPanel() {
  const [review, setReview] = useState<AgentReview | null>(null);
  const [busy, setBusy] = useState(false);

  async function runReview() {
    setBusy(true);
    try {
      const res = await fetch("/api/agent-review", { method: "POST" });
      const data = (await res.json()) as AgentReview;
      setReview(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/15 to-sky-500/10 p-5 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Money Agent</h2>
        <button
          data-testid="run-agent"
          onClick={runReview}
          disabled={busy}
          className="rounded-lg bg-violet-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
        >
          {busy ? "Reviewing…" : "Run review"}
        </button>
      </div>

      {!review ? (
        <p className="text-sm text-white/60">
          Run a review to get a financial health score and personalized
          recommendations.
        </p>
      ) : (
        <div data-testid="agent-result">
          <div className="mb-3 flex items-end gap-3">
            <span className="text-4xl font-bold tabular-nums">
              {review.healthScore}
            </span>
            <span className="pb-1 text-sm text-white/60">/ 100 health score</span>
          </div>
          <p className="mb-3 text-sm text-white/80">{review.summary}</p>
          <ul className="space-y-1.5">
            {review.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/70">
                <span className="text-violet-300">→</span>
                {rec}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/40">
            Net cashflow {formatCurrency(review.netCashflow)}/mo ·
            {" "}income {formatCurrency(review.monthlyIncome)} ·
            {" "}outflow {formatCurrency(review.monthlyOutflow)}
          </p>
        </div>
      )}
    </section>
  );
}
