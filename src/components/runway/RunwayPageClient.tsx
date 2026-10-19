"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { RunwayPanel } from "@/components/runway/RunwayPanel";
import { RunwayLedger } from "@/components/runway/RunwayLedger";
import { useRunway } from "@/hooks/useRunway";
import type { RunwayEventKind } from "@/lib/runway";

const FIX_HREF: Record<RunwayEventKind, string> = {
  bill: "/bills",
  subscription: "/subscriptions",
  income: "/income",
  planned: "/spending-later",
};

function BufferControl({
  value,
  onSave,
}: {
  value: number;
  onSave: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const commit = () => {
    if (draft == null) return;
    const n = Number(draft.replace(/[$,\s]/g, ""));
    if (Number.isFinite(n) && n >= 0) onSave(Math.round(n));
    setDraft(null);
  };
  return (
    <Card className="p-5">
      <label htmlFor="runway-buffer" className="text-sm font-medium">
        Cash buffer
      </label>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        The least you want in checking on any day. Safe to spend keeps every
        projected day at or above it. Saved on this device only.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="num text-muted-foreground">$</span>
        <input
          id="runway-buffer"
          inputMode="numeric"
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          className="num h-9 w-32 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </div>
    </Card>
  );
}

export function RunwayPageClient() {
  const rw = useRunway();
  const { result } = rw;

  return (
    <AppShell
      title="Runway"
      description="Where your cash is headed, day by day, based on what you’ve already confirmed."
    >
      <RunwayPanel runway={rw} />

      {rw.hasStartingBalance && !rw.loading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <RunwayLedger result={result} />
          <div className="space-y-6">
            <BufferControl value={rw.buffer} onSave={rw.setBuffer} />
            <Card id="not-included" className="scroll-mt-24 p-5">
              <h2 className="text-sm font-medium">Not included</h2>
              {result.exclusions.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Every active bill, approved subscription, and income source is in the projection.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {result.exclusions.map((x) => (
                    <li key={`${x.kind}:${x.sourceId}:${x.reason}`} className="text-sm">
                      <Link href={FIX_HREF[x.kind]} className="hover:text-primary">
                        {x.label}
                      </Link>
                      <p className="text-xs text-muted-foreground">{x.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-5 text-xs leading-relaxed text-muted-foreground">
              <h2 className="mb-2 text-sm font-medium text-foreground">How this is calculated</h2>
              Runway starts from today’s cash and applies each unpaid bill,
              approved subscription renewal, expected paycheck, and planned
              purchase on its date. Unpaid manual bills from the last week count
              as due today. It doesn’t guess at everyday spending, so leave room
              for groceries and gas. Every value after today is a projection, not
              account history.
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
