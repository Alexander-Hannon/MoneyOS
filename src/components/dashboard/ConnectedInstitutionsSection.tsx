"use client";

import { Building2, RefreshCw, Unplug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatLastSync } from "@/lib/data-source";
import {
  institutionEnvironmentLabel,
  isLivePlaidEnvironment,
  plaidDataDisclaimer,
} from "@/lib/plaid-ui-labels";
import { useFinancialData } from "@/hooks/useFinancialData";

export function ConnectedInstitutionsSection() {
  const fd = useFinancialData();
  const persisted = fd.plaidStorageMode === "database";
  const hasLive = fd.liveInstitutions.length > 0;
  const hasSandbox = fd.sandboxInstitutions.length > 0;
  const isLive = isLivePlaidEnvironment(fd.activePlaidEnvironment);

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Building2}
          title="Connected Institutions"
          description={
            persisted
              ? isLive
                ? "Personal live institutions persisted with encrypted server-side tokens"
                : "Plaid institutions persisted with encrypted server-side tokens"
              : "Multiple bank connections supported"
          }
          meta={
            fd.connectedInstitutions.length > 0
              ? `${fd.connectedInstitutions.length} institution${fd.connectedInstitutions.length === 1 ? "" : "s"} · ${fd.linkedAccounts.length} accounts`
              : "Not connected"
          }
        />

        {fd.devOnlyPlaidWarning && (
          <p className="mb-3 rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-2 text-[11px] text-warning">
            {fd.devOnlyPlaidWarning}
          </p>
        )}

        {fd.connectedInstitutions.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No institutions connected"
            description={
              isLive || fd.livePlaidEnabled
                ? "Connect a real bank from the header or Spending section."
                : "Connect a Plaid sandbox bank from the header or Spending section."
            }
          />
        ) : (
          <ul className="space-y-2">
            {fd.connectedInstitutions.map((inst) => (
              <li
                key={inst.id}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{inst.institutionName}</p>
                    <StatusBadge label={inst.status} tone="success" />
                    <StatusBadge
                      label={institutionEnvironmentLabel({
                        environment: inst.environment,
                        source: inst.source,
                      })}
                      tone={
                        inst.environment === "production" ||
                        inst.source === "plaid_live"
                          ? "warning"
                          : "info"
                      }
                    />
                    {persisted && (
                      <StatusBadge label="Persisted" tone="success" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inst.accountCount} account
                    {inst.accountCount === 1 ? "" : "s"} · last sync{" "}
                    {formatLastSync(inst.lastSyncAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={fd.busy}
                    onClick={() =>
                      void fd.syncTransactions(inst.plaidItemId ?? undefined)
                    }
                    className="gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    Sync
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={fd.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Disconnect ${inst.institutionName}? Historical transactions will be kept.`,
                        )
                      ) {
                        void fd.disconnectPlaid(inst.plaidItemId ?? undefined);
                      }
                    }}
                    className="gap-1.5 text-destructive"
                  >
                    <Unplug className="size-3.5" />
                    Disconnect
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          {persisted
            ? hasLive && !hasSandbox
              ? "Personal live data — persisted to database with encrypted access tokens (server-side only)."
              : hasLive && hasSandbox
                ? "Sandbox and personal live data persisted to database with encrypted access tokens."
                : "Plaid sandbox data — persisted to database with encrypted access tokens (server-side only)."
            : "Sign in with database + PLAID_TOKEN_ENCRYPTION_KEY configured to persist connections across restarts."}
        </p>
        {fd.plaidConnected && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {plaidDataDisclaimer(fd.activePlaidEnvironment)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
