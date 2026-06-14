import type { TransactionCategory } from "@/types/transactions";

export type AIProvider = "mock" | "openai" | "gemini" | "groq";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string | null;
  model: string | null;
  configured: boolean;
}

/** Sanitized financial snapshot — no tokens, account numbers, or secrets. */
export interface MoneyBriefInput {
  appMode: string;
  modeContext: string;
  dataSource: string;
  cashAvailable: number;
  billsDue14Days: number;
  billsDue14Count: number;
  incomeExpected14Days: number;
  monthlySpending: number;
  monthlyIncome: number;
  topCategories: { category: string; total: number }[];
  reviewItemsCount: number;
  recurringChargesCount: number;
  upcomingObligations: string[];
  activeAlerts: {
    title: string;
    severity: string;
    category: string;
    reviewRequired: boolean;
  }[];
  chartDataSource: string;
  hasHistoricalTransactionData: boolean;
  isProjection: boolean;
  cashDataSource: string;
  setupIncomplete: boolean;
  expectedMonthlyIncome: number;
}

export interface MoneyBriefOutput {
  snapshot: string;
  topRisks: string[];
  opportunities: string[];
  recommendedNextAction: string;
  reviewRequiredItems: string[];
  automationIdeas: string[];
  provider: AIProvider;
  mock: boolean;
  modeNotice?: string;
}

export interface ExplainAlertInput {
  title: string;
  description: string;
  severity: string;
  category: string;
  suggestedAction: string;
  contextSummary: {
    dataSource: string;
    cashAvailable: number;
    billsDue14Days: number;
    reviewItemsCount: number;
  };
}

export interface ExplainAlertOutput {
  plainEnglishExplanation: string;
  whyItMatters: string;
  suggestedReviewSteps: string[];
  whatNotToDo: string[];
  provider: AIProvider;
  mock: boolean;
}

export interface ClassifyTransactionInput {
  merchantName: string;
  description: string;
  amount: number;
  currentCategory: string;
  date: string;
  direction: "inflow" | "outflow";
}

export interface ClassifyTransactionOutput {
  suggestedCategory: TransactionCategory;
  confidence: "low" | "medium" | "high";
  reason: string;
  shouldCountAsSpending: boolean;
  requiresUserApproval: true;
  provider: AIProvider;
  mock: boolean;
}

export interface AIErrorResponse {
  error: string;
  configured: boolean;
}
