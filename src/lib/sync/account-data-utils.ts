import type { UserDataExport } from "@/lib/storage/store";
import { hasExistingUserData } from "@/lib/storage/local-storage";

export type DomainCounts = {
  bills: number;
  income: number;
  subscriptions: number;
  alerts: number;
  manualAccounts: number;
  spendingLater: number;
  weeklyReviews: number;
};

export function countBundleRecords(
  bundle: Partial<UserDataExport> | null | undefined,
): DomainCounts {
  return {
    bills: bundle?.bills?.length ?? 0,
    income: bundle?.income?.length ?? 0,
    subscriptions: bundle?.subscriptions?.length ?? 0,
    alerts: bundle?.alerts?.length ?? 0,
    manualAccounts: bundle?.manualAccounts?.length ?? 0,
    spendingLater: bundle?.spendingLater?.length ?? 0,
    weeklyReviews: 0,
  };
}

export function totalRecords(counts: DomainCounts): number {
  return (
    counts.bills +
    counts.income +
    counts.subscriptions +
    counts.alerts +
    counts.manualAccounts +
    counts.spendingLater +
    counts.weeklyReviews
  );
}

export function localDataFingerprint(bundle: UserDataExport): string {
  const parts = [
    bundle.bills.map((b) => b.id).sort().join(","),
    bundle.subscriptions.map((s) => s.id).sort().join(","),
    bundle.income.map((i) => i.id).sort().join(","),
  ];
  return parts.join("|").slice(0, 512);
}

export function isLocalDataEmpty(bundle: UserDataExport): boolean {
  return totalRecords(countBundleRecords(bundle)) === 0;
}

export function shouldApplyAccountData(args: {
  serverCounts: DomainCounts;
  localBundle: UserDataExport;
  localDirty: boolean;
  serverUpdatedAt: string | null;
  lastSyncedAt: string | null;
}): boolean {
  const serverTotal = totalRecords(args.serverCounts);
  const localTotal = totalRecords(countBundleRecords(args.localBundle));
  const localEmpty = localTotal === 0 && !hasExistingUserData();

  if (serverTotal === 0) return false;
  if (localEmpty) return true;
  if (localTotal === 0 && serverTotal > 0) return true;

  if (args.localDirty) return false;

  if (!args.serverUpdatedAt) return serverTotal > localTotal;

  if (!args.lastSyncedAt) {
    return serverTotal >= localTotal;
  }

  return (
    new Date(args.serverUpdatedAt).getTime() >
    new Date(args.lastSyncedAt).getTime()
  );
}

export function wouldWipeAccountData(args: {
  existingCounts: DomainCounts;
  incomingCounts: DomainCounts;
}): boolean {
  return (
    totalRecords(args.existingCounts) > 0 &&
    totalRecords(args.incomingCounts) === 0
  );
}

export function logAccountSyncDev(message: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[MoneyOS account-sync] ${message}`, meta ?? {});
  }
}
