"use client";

import { Building2, RefreshCw, Unplug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatLastSync } from "@/lib/data-source";
import { useFinancialData } from "@/hooks/useFinancialData";

export function ConnectedInstitutionsSection() {
  const fd = useFinancialData();

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Building2}
          title="Connected Institutions"
          description="Multiple bank connections supported — sandbox only in this build"
          meta={
            fd.connectedInstitutions.length > 0
              ? `${fd.connectedInstitutions.length} institution${fd.connectedInstitutions.length === 1 ? "" : "s"} · ${fd.linkedAccounts.length} accounts`
              : "Not connected"
          }
        />

        {fd.connectedInstitutions.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No institutions connected"
            description="Connect a Plaid sandbox bank from the header or Spending section. Live connections are not enabled yet."
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
                    <StatusBadge label="Plaid sandbox" tone="info" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inst.accountCount} account{inst.accountCount === 1 ? "" : "s"} ·
                    last sync {formatLastSync(inst.lastSyncAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={fd.busy}
                    onClick={() => void fd.syncTransactions()}
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
                          "Disconnect the Plaid sandbox session?",
                        )
                      ) {
                        void fd.disconnectSandbox();
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
          Structure supports multiple Plaid Items. Persistent multi-institution
          storage is not enabled in this build.
        </p>
      </CardContent>
    </Card>
  );
}
