"use client";

import { RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePlaid } from "@/components/spending/plaid-context";
import type { Tone } from "@/types/money";

function statusTone(status: string): Tone {
  if (status === "connected") return "success";
  if (status === "error") return "danger";
  return "neutral";
}

function formatTime(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PlaidStatusCard() {
  const plaid = usePlaid();

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Plaid configured",
      value: (
        <StatusBadge
          label={plaid.configured ? "Yes" : "No"}
          tone={plaid.configured ? "success" : "neutral"}
        />
      ),
    },
    {
      label: "Connection status",
      value: (
        <StatusBadge
          label={plaid.status.replace("_", " ")}
          tone={statusTone(plaid.status)}
        />
      ),
    },
    {
      label: "Data source",
      value: (
        <StatusBadge
          label={plaid.source === "plaid_sandbox" ? "Plaid sandbox" : "Mock"}
          tone={plaid.source === "plaid_sandbox" ? "info" : "neutral"}
        />
      ),
    },
    {
      label: "Last sync",
      value: (
        <span className="text-sm text-muted-foreground">
          {formatTime(plaid.lastSyncAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Wifi className="size-4 text-info" /> Plaid connection
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={plaid.status !== "connected" || plaid.busy}
          onClick={() => void plaid.syncNow()}
        >
          <RefreshCw className={`size-3.5 ${plaid.busy ? "animate-spin" : ""}`} />
          {plaid.busy ? "Syncing…" : "Sync transactions"}
        </Button>
      </div>
      <dl className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <dt className="text-xs text-muted-foreground">{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      {plaid.error && (
        <p className="mt-3 rounded-[var(--radius-md)] bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {plaid.error}
        </p>
      )}
    </div>
  );
}
