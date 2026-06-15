import { getPrisma } from "@/lib/db/prisma";
import type { TransactionCategory } from "@/types/transactions";

export type TransactionRuleRecord = {
  id: string;
  merchantPattern: string;
  category: string;
  shouldCountAsSpending: boolean;
  confidenceSource: string;
};

export async function listTransactionRulesForUser(
  userId: string,
): Promise<TransactionRuleRecord[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.transactionRule.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createTransactionRuleForUser(args: {
  userId: string;
  merchantPattern: string;
  category: string;
  shouldCountAsSpending: boolean;
  confidenceSource?: "user_approved" | "system" | "ai_suggested";
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const pattern = args.merchantPattern.trim().toLowerCase();
  const existing = await prisma.transactionRule.findFirst({
    where: { userId: args.userId, merchantPattern: pattern },
  });

  if (existing) {
    return prisma.transactionRule.update({
      where: { id: existing.id },
      data: {
        category: args.category,
        shouldCountAsSpending: args.shouldCountAsSpending,
        confidenceSource: args.confidenceSource ?? "user_approved",
      },
    });
  }

  return prisma.transactionRule.create({
    data: {
      userId: args.userId,
      merchantPattern: pattern,
      category: args.category,
      shouldCountAsSpending: args.shouldCountAsSpending,
      confidenceSource: args.confidenceSource ?? "user_approved",
    },
  });
}

export function matchTransactionRule(
  merchantName: string,
  rules: TransactionRuleRecord[],
): TransactionRuleRecord | null {
  const name = merchantName.toLowerCase();
  return (
    rules.find((rule) => name.includes(rule.merchantPattern.toLowerCase())) ??
    null
  );
}

export function ruleCategoryToTransactionCategory(
  category: string,
): TransactionCategory {
  const allowed: TransactionCategory[] = [
    "Food",
    "Gas",
    "Fitness",
    "Convenience / Shopping",
    "Business / Productivity",
    "Tech",
    "Bills",
    "Income",
    "Transfer",
    "Review",
    "Other",
  ];
  return allowed.includes(category as TransactionCategory)
    ? (category as TransactionCategory)
    : "Other";
}
