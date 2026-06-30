import type { Account } from "@/types/money";
import type { LinkedAccount } from "@/types/transactions";
import type { DashboardSummary } from "@/lib/data-source";
import { totalCashAvailable } from "@/lib/money-utils";

const CASH_LIKE_TYPES = new Set(["checking", "savings", "cash"]);

export type CashBucketKey =
  | "checking"
  | "savings"
  | "high_yield_savings"
  | "manual_cash"
  | "other_manual";

export type CashBucket = {
  key: CashBucketKey;
  label: string;
  total: number;
  accountCount: number;
};

export type CashAccountRow = {
  id: string;
  name: string;
  institution: string;
  typeLabel: string;
  currentBalance: number;
  availableBalance: number | null;
  sourceLabel: string;
  isLive: boolean;
  isManual: boolean;
  countsTowardCash: boolean;
  mask?: string;
};

export type CashBreakdown = {
  totalCashAvailable: number;
  dataSourceLabel: string;
  buckets: CashBucket[];
  cashAccounts: CashAccountRow[];
  excludedAccounts: CashAccountRow[];
};

function isHighYieldSavings(type: string, subtype?: string): boolean {
  const text = `${type} ${subtype ?? ""}`.toLowerCase();
  return (
    type === "savings" &&
    /high[\s-]?yield|hysa|money market|mm/.test(text)
  );
}

export function cashDataSourceLabel(
  cashDataSource: DashboardSummary["cashDataSource"],
): string {
  switch (cashDataSource) {
    case "plaid_live":
      return "Personal Live";
    case "mixed":
      return "Mixed Manual + Live";
    case "manual":
      return "Manual";
    case "demo":
      return "Demo";
    case "plaid_sandbox":
      return "Plaid Sandbox";
    default:
      return "Local";
  }
}

function linkedSourceLabel(source: LinkedAccount["source"]): string {
  return source === "plaid_live" ? "Personal Live" : "Plaid Sandbox";
}

function manualSourceLabel(): string {
  return "Manual";
}

export function buildCashBreakdown(args: {
  accounts: Account[];
  linkedAccounts: LinkedAccount[];
  cashDataSource: DashboardSummary["cashDataSource"];
}): CashBreakdown {
  const { accounts, linkedAccounts, cashDataSource } = args;
  const cashAccounts: CashAccountRow[] = [];
  const excludedAccounts: CashAccountRow[] = [];

  for (const linked of linkedAccounts) {
    const row: CashAccountRow = {
      id: linked.id,
      name: linked.name,
      institution: linked.institution,
      typeLabel: linked.subtype
        ? `${linked.type} / ${linked.subtype}`
        : linked.type,
      currentBalance: linked.currentBalance ?? linked.availableBalance ?? 0,
      availableBalance: linked.availableBalance ?? null,
      sourceLabel: linkedSourceLabel(linked.source),
      isLive: linked.source === "plaid_live",
      isManual: false,
      countsTowardCash: CASH_LIKE_TYPES.has(linked.type),
      mask: linked.mask,
    };
    if (row.countsTowardCash) cashAccounts.push(row);
    else excludedAccounts.push(row);
  }

  for (const manual of accounts.filter((a) => a.source === "manual" || !a.source)) {
    if (linkedAccounts.some((linked) => linked.id === manual.id)) continue;
    const row: CashAccountRow = {
      id: manual.id,
      name: manual.name,
      institution: manual.institution ?? "Manual",
      typeLabel: manual.type,
      currentBalance: manual.balance,
      availableBalance: manual.availableBalance ?? null,
      sourceLabel: manualSourceLabel(),
      isLive: false,
      isManual: true,
      countsTowardCash: manual.accessible && CASH_LIKE_TYPES.has(manual.type),
    };
    if (row.countsTowardCash) cashAccounts.push(row);
    else excludedAccounts.push(row);
  }

  const bucketTotals = new Map<CashBucketKey, { total: number; count: number }>([
    ["checking", { total: 0, count: 0 }],
    ["savings", { total: 0, count: 0 }],
    ["high_yield_savings", { total: 0, count: 0 }],
    ["manual_cash", { total: 0, count: 0 }],
    ["other_manual", { total: 0, count: 0 }],
  ]);

  for (const row of cashAccounts) {
    const amount = row.availableBalance ?? row.currentBalance;
    const [typePart, subtypePart] = row.typeLabel.split(" / ");
    let key: CashBucketKey = "other_manual";
    if (row.isManual) {
      key = typePart === "cash" ? "manual_cash" : "other_manual";
    } else if (isHighYieldSavings(typePart ?? row.typeLabel, subtypePart)) {
      key = "high_yield_savings";
    } else if ((typePart ?? row.typeLabel).toLowerCase().includes("checking")) {
      key = "checking";
    } else if ((typePart ?? row.typeLabel).toLowerCase().includes("savings")) {
      key = "savings";
    } else if ((typePart ?? row.typeLabel).toLowerCase().includes("cash")) {
      key = "manual_cash";
    }
    const bucket = bucketTotals.get(key)!;
    bucket.total += amount;
    bucket.count += 1;
  }

  const bucketLabels: Record<CashBucketKey, string> = {
    checking: "Connected checking",
    savings: "Connected savings",
    high_yield_savings: "High-yield savings",
    manual_cash: "Manual cash accounts",
    other_manual: "Other manual cash-like",
  };

  const buckets: CashBucket[] = (
    Object.keys(bucketLabels) as CashBucketKey[]
  )
    .map((key) => {
      const row = bucketTotals.get(key)!;
      return {
        key,
        label: bucketLabels[key],
        total: row.total,
        accountCount: row.count,
      };
    })
    .filter((bucket) => bucket.accountCount > 0);

  return {
    totalCashAvailable: totalCashAvailable(accounts),
    dataSourceLabel: cashDataSourceLabel(cashDataSource),
    buckets,
    cashAccounts,
    excludedAccounts,
  };
}

export function maskSafeAccountName(name: string, mask?: string): string {
  return mask ? `${name} ••${mask}` : name;
}
