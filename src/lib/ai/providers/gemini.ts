// Server-side Gemini Money Agent provider. Never import from client components.

import type {
  AIConfig,
  ClassifyTransactionInput,
  ClassifyTransactionOutput,
  ExplainAlertInput,
  ExplainAlertOutput,
  MoneyBriefInput,
  MoneyBriefOutput,
} from "@/lib/ai/types";
import {
  CLASSIFY_TRANSACTION_USER_PROMPT,
  EXPLAIN_ALERT_USER_PROMPT,
  MONEY_AGENT_SYSTEM_PROMPT,
  MONEY_BRIEF_USER_PROMPT,
} from "@/lib/ai/money-agent-prompts";
import { generateGeminiJson } from "@/lib/ai/providers/gemini-client";
import { buildSimpleBriefFields } from "@/lib/ai/brief-simple";
import type { TransactionCategory } from "@/types/transactions";

const TRANSACTION_CATEGORIES: TransactionCategory[] = [
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

const MONEY_BRIEF_SCHEMA = {
  type: "object",
  properties: {
    snapshot: { type: "string" },
    topRisks: { type: "array", items: { type: "string" } },
    opportunities: { type: "array", items: { type: "string" } },
    recommendedNextAction: { type: "string" },
    reviewRequiredItems: { type: "array", items: { type: "string" } },
    automationIdeas: { type: "array", items: { type: "string" } },
  },
  required: [
    "snapshot",
    "topRisks",
    "opportunities",
    "recommendedNextAction",
    "reviewRequiredItems",
    "automationIdeas",
  ],
};

const EXPLAIN_ALERT_SCHEMA = {
  type: "object",
  properties: {
    plainEnglishExplanation: { type: "string" },
    whyItMatters: { type: "string" },
    suggestedReviewSteps: { type: "array", items: { type: "string" } },
    whatNotToDo: { type: "array", items: { type: "string" } },
  },
  required: [
    "plainEnglishExplanation",
    "whyItMatters",
    "suggestedReviewSteps",
    "whatNotToDo",
  ],
};

const CLASSIFY_TRANSACTION_SCHEMA = {
  type: "object",
  properties: {
    suggestedCategory: {
      type: "string",
      enum: TRANSACTION_CATEGORIES,
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    reason: { type: "string" },
    shouldCountAsSpending: { type: "boolean" },
  },
  required: ["suggestedCategory", "confidence", "reason", "shouldCountAsSpending"],
};

type GeminiMoneyBriefPayload = Omit<
  MoneyBriefOutput,
  "provider" | "mock" | "modeNotice"
>;

type GeminiExplainAlertPayload = Omit<
  ExplainAlertOutput,
  "provider" | "mock"
>;

type GeminiClassifyPayload = Omit<
  ClassifyTransactionOutput,
  "provider" | "mock" | "requiresUserApproval"
>;

function buildMoneyBriefPrompt(input: MoneyBriefInput): string {
  return `${MONEY_BRIEF_USER_PROMPT}

Mode context: ${input.modeContext}
Data source: ${input.dataSource}
App mode: ${input.appMode}

Financial summary (sanitized):
- Cash available: ${input.cashAvailable}
- Bills due in 14 days: ${input.billsDue14Days} (${input.billsDue14Count} bills)
- Income expected in 14 days: ${input.incomeExpected14Days}
- Monthly spending: ${input.monthlySpending}
- Monthly income: ${input.monthlyIncome}
- Review items: ${input.reviewItemsCount}
- Recurring charge candidates: ${input.recurringChargesCount}
- Top categories: ${JSON.stringify(input.topCategories)}
- Upcoming obligations: ${JSON.stringify(input.upcomingObligations)}
- Chart: ${input.chartDataSource}
- Has historical transaction data: ${input.hasHistoricalTransactionData}
- Is projection (not history): ${input.isProjection}
- Cash data source: ${input.cashDataSource}
- Setup incomplete: ${input.setupIncomplete}
- Expected monthly income (manual): ${input.expectedMonthlyIncome}

Return JSON only. Frame all guidance as review-required. Never instruct the user to move, spend, or invest money automatically.`;
}

function buildExplainAlertPrompt(input: ExplainAlertInput): string {
  return `${EXPLAIN_ALERT_USER_PROMPT}

Alert:
- Title: ${input.title}
- Description: ${input.description}
- Severity: ${input.severity}
- Category: ${input.category}
- Suggested action (for review): ${input.suggestedAction}

Context:
- Data source: ${input.contextSummary.dataSource}
- Cash available: ${input.contextSummary.cashAvailable}
- Bills due 14d: ${input.contextSummary.billsDue14Days}
- Review items: ${input.contextSummary.reviewItemsCount}

Return JSON only. The user must decide — do not authorize any money movement.`;
}

function buildClassifyPrompt(input: ClassifyTransactionInput): string {
  return `${CLASSIFY_TRANSACTION_USER_PROMPT}

Transaction:
- Merchant: ${input.merchantName}
- Description: ${input.description}
- Amount: ${input.amount}
- Direction: ${input.direction}
- Current category: ${input.currentCategory}
- Date: ${input.date}

Valid categories: ${TRANSACTION_CATEGORIES.join(", ")}

Return JSON only. This is a suggestion — the user must approve before applying.`;
}

function normalizeCategory(value: string): TransactionCategory {
  return TRANSACTION_CATEGORIES.includes(value as TransactionCategory)
    ? (value as TransactionCategory)
    : "Review";
}

export async function geminiMoneyBrief(
  config: AIConfig,
  input: MoneyBriefInput,
): Promise<MoneyBriefOutput> {
  const payload = await generateGeminiJson<GeminiMoneyBriefPayload>(config, {
    systemPrompt: MONEY_AGENT_SYSTEM_PROMPT,
    userPrompt: buildMoneyBriefPrompt(input),
    responseSchema: MONEY_BRIEF_SCHEMA,
  });

  return {
    ...buildSimpleBriefFields(input),
    snapshot: payload.snapshot,
    topRisks: payload.topRisks.slice(0, 6),
    opportunities: payload.opportunities.slice(0, 6),
    recommendedNextAction: payload.recommendedNextAction,
    reviewRequiredItems: payload.reviewRequiredItems.slice(0, 8),
    automationIdeas: payload.automationIdeas.slice(0, 6),
    provider: "gemini",
    mock: false,
    modeNotice: input.modeContext,
  };
}

export async function geminiExplainAlert(
  config: AIConfig,
  input: ExplainAlertInput,
): Promise<ExplainAlertOutput> {
  const payload = await generateGeminiJson<GeminiExplainAlertPayload>(config, {
    systemPrompt: MONEY_AGENT_SYSTEM_PROMPT,
    userPrompt: buildExplainAlertPrompt(input),
    responseSchema: EXPLAIN_ALERT_SCHEMA,
  });

  return {
    plainEnglishExplanation: payload.plainEnglishExplanation,
    whyItMatters: payload.whyItMatters,
    suggestedReviewSteps: payload.suggestedReviewSteps.slice(0, 8),
    whatNotToDo: payload.whatNotToDo.slice(0, 8),
    provider: "gemini",
    mock: false,
  };
}

export async function geminiClassifyTransaction(
  config: AIConfig,
  input: ClassifyTransactionInput,
): Promise<ClassifyTransactionOutput> {
  const payload = await generateGeminiJson<GeminiClassifyPayload>(config, {
    systemPrompt: MONEY_AGENT_SYSTEM_PROMPT,
    userPrompt: buildClassifyPrompt(input),
    responseSchema: CLASSIFY_TRANSACTION_SCHEMA,
  });

  const suggestedCategory = normalizeCategory(payload.suggestedCategory);

  return {
    suggestedCategory,
    confidence: payload.confidence,
    reason: payload.reason,
    shouldCountAsSpending: payload.shouldCountAsSpending,
    requiresUserApproval: true,
    provider: "gemini",
    mock: false,
  };
}
