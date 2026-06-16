"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";

type PlaidDiagnostics = {
  plaidConfigured: boolean;
  plaidConfigValid: boolean;
  plaidEnv: string | null;
  plaidProducts: string[];
  plaidCountryCodes: string[];
  databaseConfigured: boolean;
  authConfigured: boolean;
  encryptionConfigured: boolean;
  storageMode: string;
  connected: boolean;
  institutionCount: number;
  diagnostics?: {
    issues: string[];
    warnings: string[];
    aiProvider: string;
    geminiConfigured: boolean;
    encryptionRoundTripOk: boolean;
    storedEncryptionHealth?: {
      hasStoredTokens: boolean;
      decryptOk: boolean | null;
    };
  };
};

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function formatIssue(code: string): string {
  return code.replaceAll("_", " ");
}

export function EnvironmentDiagnosticsPanel() {
  const [data, setData] = useState<PlaidDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plaid/status")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json as PlaidDiagnostics);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load environment diagnostics.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const diagnostics = data?.diagnostics;
  const showEncryptionWarning =
    data?.databaseConfigured && !data?.encryptionConfigured;
  const showMismatchWarning =
    diagnostics?.storedEncryptionHealth?.decryptOk === false;
  const showSharedDbWarning = diagnostics?.warnings.includes(
    "shared_database_encryption_key_must_match_across_devices",
  );

  return (
    <Card className="border-dashed border-info/40">
      <CardContent className="space-y-4 pt-5">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Stethoscope className="size-4 text-info" />
          Environment diagnostics
          <StatusBadge label="Development only" tone="info" />
        </h2>
        <p className="text-xs text-muted-foreground">
          Safe configuration summary — no secret values are shown. Restart{" "}
          <code className="text-foreground">npm run dev</code> after editing{" "}
          <code className="text-foreground">.env.local</code>.
        </p>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {data && (
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <Row label="Plaid configured" value={yesNo(data.plaidConfigured)} />
            <Row
              label="Plaid config valid"
              value={yesNo(data.plaidConfigValid)}
              tone={data.plaidConfigValid ? "success" : "warning"}
            />
            <Row label="Plaid env" value={data.plaidEnv ?? "—"} />
            <Row
              label="Products requested"
              value={data.plaidProducts.join(", ") || "—"}
            />
            <Row label="Database configured" value={yesNo(data.databaseConfigured)} />
            <Row label="Auth configured" value={yesNo(data.authConfigured)} />
            <Row
              label="Encryption configured"
              value={yesNo(data.encryptionConfigured)}
            />
            <Row
              label="AI provider"
              value={diagnostics?.aiProvider ?? "mock"}
            />
            <Row
              label="Gemini configured"
              value={yesNo(Boolean(diagnostics?.geminiConfigured))}
            />
            <Row label="Storage mode" value={data.storageMode} />
            <Row
              label="Institutions connected"
              value={String(data.institutionCount)}
            />
          </dl>
        )}

        {showEncryptionWarning && (
          <Warning>
            Database is configured but PLAID_TOKEN_ENCRYPTION_KEY is missing or
            invalid. Persisted Plaid sandbox tokens require a valid 32-byte key.
          </Warning>
        )}

        {showMismatchWarning && (
          <Warning>
            Stored Plaid tokens could not be decrypted with the current
            PLAID_TOKEN_ENCRYPTION_KEY. If laptop and desktop share the same Neon
            database, both must use the identical encryption key.
          </Warning>
        )}

        {showSharedDbWarning && !showMismatchWarning && (
          <Warning>
            Shared Neon database detected. Use the same
            PLAID_TOKEN_ENCRYPTION_KEY on every device that shares this database.
            Mismatch cannot be verified until decrypt is attempted.
          </Warning>
        )}

        {diagnostics && diagnostics.issues.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Configuration issues
            </p>
            <ul className="space-y-1 text-xs text-warning">
              {diagnostics.issues.slice(0, 12).map((issue) => (
                <li key={issue} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{formatIssue(issue)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === "warning"
            ? "font-medium text-warning"
            : tone === "success"
              ? "font-medium text-success"
              : "font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
