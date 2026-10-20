import type { UserDataExport } from "@/lib/storage/store";

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


export function isLocalDataEmpty(bundle: UserDataExport): boolean {
  return totalRecords(countBundleRecords(bundle)) === 0;
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
