"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaidLinkExitDiagnostics } from "@/lib/plaid/link-diagnostics";

export function PlaidLinkExitAlert({
  diagnostics,
  busy,
  onRetry,
  onTryAnother,
  onDismiss,
}: {
  diagnostics: PlaidLinkExitDiagnostics;
  busy?: boolean;
  onRetry: () => void;
  onTryAnother: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-3 space-y-3 rounded-[var(--radius-md)] border border-warning/40 bg-warning/5 p-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {diagnostics.headline}
          </p>
          {diagnostics.detail && (
            <p className="text-xs text-muted-foreground">{diagnostics.detail}</p>
          )}
          {(diagnostics.errorCode || diagnostics.status) && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {[
                diagnostics.errorCode && `code: ${diagnostics.errorCode}`,
                diagnostics.status && `status: ${diagnostics.status}`,
                diagnostics.requestId && `request: ${diagnostics.requestId}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {diagnostics.institutionName && (
            <p className="text-xs text-muted-foreground">
              Institution: {diagnostics.institutionName}
            </p>
          )}
        </div>
      </div>

      {diagnostics.showInstitutionFallback && (
        <p className="text-xs text-muted-foreground">
          This institution may not support the selected Plaid product or may
          require a different connection flow. Try another institution first,
          then return to this one.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Retry with a fresh Link session or try another institution. If this
        institution keeps closing, try a major bank first to verify live mode.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Retry Plaid connection
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={onTryAnother}>
          Try another institution
        </Button>
        {onDismiss && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
