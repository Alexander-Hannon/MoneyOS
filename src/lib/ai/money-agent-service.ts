// Server-side Money Agent service. Never import from client components.

import type {
  AIConfig,
  AIProvider,
  ClassifyTransactionInput,
  ClassifyTransactionOutput,
  ExplainAlertInput,
  ExplainAlertOutput,
  MoneyBriefInput,
  MoneyBriefOutput,
} from "@/lib/ai/types";
import { categorizeMerchant } from "@/lib/transaction-utils";
import type { TransactionCategory } from "@/types/transactions";

export function getAIConfig(): AIConfig {
  const raw = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const provider: AIProvider =
    raw === "openai" || raw === "gemini" || raw === "groq" ? raw : "mock";
  const apiKey = process.env.AI_API_KEY?.trim() || null;
  const model = process.env.AI_MODEL?.trim() || null;

  return {
    provider,
    apiKey,
    model,
    configured: provider !== "mock" && Boolean(apiKey),
  };
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function mockMoneyBrief(input: MoneyBriefInput): MoneyBriefOutput {
  const modeNotice = input.modeContext;

  if (
    input.modeContext.includes("Empty state") ||
    (input.billsDue14Count === 0 &&
      input.cashAvailable === 0 &&
      input.activeAlerts.length === 0 &&
      input.appMode === "local_user")
  ) {
    return {
      snapshot:
        "Not enough data yet for a meaningful brief. Add bills, income, subscriptions, or connect a sandbox bank.",
      topRisks: ["Insufficient data — do not treat this as a financial assessment."],
      opportunities: [
        "Add your recurring bills and income sources in MoneyOS.",
        "Or load demo data from Settings to explore features safely.",
      ],
      recommendedNextAction:
        "Add at least one bill or income source, or connect Plaid sandbox, before acting on recommendations.",
      reviewRequiredItems: [],
      automationIdeas: [],
      provider: "mock",
      mock: true,
      modeNotice,
    };
  }

  const runway = input.cashAvailable + input.incomeExpected14Days;
  const tight = input.billsDue14Days > runway * 0.6;

  const topRisks: string[] = [];
  if (input.billsDue14Days > input.cashAvailable) {
    topRisks.push(
      `Upcoming bills (${formatCurrency(input.billsDue14Days)}) exceed current cash (${formatCurrency(input.cashAvailable)}).`,
    );
  }
  if (input.reviewItemsCount > 0) {
    topRisks.push(
      `${input.reviewItemsCount} item(s) need classification or a manual decision before trusting spending totals.`,
    );
  }
  if (input.activeAlerts.some((a) => a.severity === "high" && a.reviewRequired)) {
    topRisks.push("A high-priority alert requires your review before the next pay cycle.");
  }
  if (topRisks.length === 0) {
    topRisks.push("No critical risks detected in the demo summary — keep monitoring recurring obligations.");
  }

  const topCategory = input.topCategories[0];
  const opportunities: string[] = [];
  if (topCategory && topCategory.total > 200) {
    opportunities.push(
      `${topCategory.category} is the largest spending bucket (${formatCurrency(topCategory.total)} this month) — worth a quick audit.`,
    );
  }
  if (input.recurringChargesCount > 0) {
    opportunities.push(
      `${input.recurringChargesCount} recurring charge candidate(s) — confirm each is still intentional.`,
    );
  }
  opportunities.push("Align bill autopay accounts with your intended cash buffers.");

  const highAlert = input.activeAlerts.find(
    (a) => a.severity === "high" && a.reviewRequired,
  );

  return {
    snapshot: `${input.modeContext} · ${input.dataSource} · Cash ${formatCurrency(input.cashAvailable)} · Bills due 14d ${formatCurrency(input.billsDue14Days)} (${input.billsDue14Count}) · Spending ${formatCurrency(input.monthlySpending)}/mo${tight ? " · Buffer is getting tight" : ""}.`,
    topRisks,
    opportunities,
    recommendedNextAction:
      highAlert?.title ??
      (input.reviewItemsCount > 0
        ? "Review uncategorized transactions and confirm categories before adjusting your budget."
        : "Confirm upcoming bill amounts and autopay sources for the next two weeks."),
    reviewRequiredItems: input.activeAlerts
      .filter((a) => a.reviewRequired)
      .map((a) => a.title)
      .slice(0, 5),
    automationIdeas: [
      "Set calendar reminders for variable bills 3 days before due dates.",
      "Review subscription list monthly — cancel before renewal when possible.",
      input.appMode === "plaid_sandbox"
        ? "Sync sandbox transactions after connecting Plaid to refresh categories."
        : "Connect Plaid sandbox in Settings to explore live-style transaction data safely.",
    ],
    provider: "mock",
    mock: true,
    modeNotice,
  };
}

function mockExplainAlert(input: ExplainAlertInput): ExplainAlertOutput {
  return {
    plainEnglishExplanation: `${input.title}. ${input.description} The suggested direction is: ${input.suggestedAction}`,
    whyItMatters:
      input.severity === "high"
        ? "High-priority items can affect cash available for other obligations if left unreviewed."
        : "Even lower-priority items add up — reviewing early prevents surprise shortfalls.",
    suggestedReviewSteps: [
      "Read the alert details and verify against your actual accounts (demo or connected).",
      "Compare the suggested action to your current autopay and buffer plan.",
      "Decide yes/no/adjust — then mark reviewed or archive in Money Agent Alerts.",
      "If unsure, postpone money movement until you confirm amounts and sources.",
    ],
    whatNotToDo: [
      "Do not transfer money or change autopay based on this explanation alone.",
      "Do not treat this as tax, legal, or investment advice.",
      "Do not share access tokens or credentials while investigating.",
    ],
    provider: "mock",
    mock: true,
  };
}

function mockClassifyTransaction(
  input: ClassifyTransactionInput,
): ClassifyTransactionOutput {
  const { category } = categorizeMerchant(input.merchantName);
  const suggested: TransactionCategory =
    category === "Other" || category === "Review" ? "Convenience / Shopping" : category;

  const abs = Math.abs(input.amount);
  let confidence: ClassifyTransactionOutput["confidence"] = "low";
  if (/amazon|starbucks|shell|whole foods|netflix|spotify/.test(input.merchantName.toLowerCase())) {
    confidence = "high";
  } else if (abs < 100) {
    confidence = "medium";
  }

  return {
    suggestedCategory: suggested,
    confidence,
    reason: `Based on merchant text "${input.merchantName}" and ${input.direction} of ${formatCurrency(abs)} — demo suggestion only.`,
    shouldCountAsSpending: input.direction === "outflow" && suggested !== "Transfer" && suggested !== "Income",
    requiresUserApproval: true,
    provider: "mock",
    mock: true,
  };
}

async function callRealProvider<T>(
  _config: AIConfig,
  _prompt: string,
  fallback: () => T,
): Promise<T> {
  // Real provider wiring deferred until AI_API_KEY is configured.
  return fallback();
}

export async function generateMoneyBrief(
  input: MoneyBriefInput,
): Promise<MoneyBriefOutput> {
  const config = getAIConfig();
  if (!config.configured) {
    return mockMoneyBrief(input);
  }
  return callRealProvider(config, "money-brief", () => mockMoneyBrief(input));
}

export async function explainAlert(
  input: ExplainAlertInput,
): Promise<ExplainAlertOutput> {
  const config = getAIConfig();
  if (!config.configured) {
    return mockExplainAlert(input);
  }
  return callRealProvider(config, "explain-alert", () => mockExplainAlert(input));
}

export async function classifyTransactionSuggestion(
  input: ClassifyTransactionInput,
): Promise<ClassifyTransactionOutput> {
  const config = getAIConfig();
  if (!config.configured) {
    return mockClassifyTransaction(input);
  }
  return callRealProvider(config, "classify-transaction", () =>
    mockClassifyTransaction(input),
  );
}

/** Build sanitized brief input shape (usable from API validation). */
export function sanitizeMoneyBriefInput(
  body: unknown,
): MoneyBriefInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.dataSource !== "string") return null;
  return {
    appMode: String(b.appMode ?? "local_user"),
    modeContext: String(b.modeContext ?? ""),
    dataSource: b.dataSource,
    cashAvailable: Number(b.cashAvailable) || 0,
    billsDue14Days: Number(b.billsDue14Days) || 0,
    billsDue14Count: Number(b.billsDue14Count) || 0,
    incomeExpected14Days: Number(b.incomeExpected14Days) || 0,
    monthlySpending: Number(b.monthlySpending) || 0,
    monthlyIncome: Number(b.monthlyIncome) || 0,
    topCategories: Array.isArray(b.topCategories)
      ? (b.topCategories as { category: string; total: number }[]).slice(0, 8)
      : [],
    reviewItemsCount: Number(b.reviewItemsCount) || 0,
    recurringChargesCount: Number(b.recurringChargesCount) || 0,
    upcomingObligations: Array.isArray(b.upcomingObligations)
      ? (b.upcomingObligations as string[]).slice(0, 10)
      : [],
    activeAlerts: Array.isArray(b.activeAlerts)
      ? (b.activeAlerts as MoneyBriefInput["activeAlerts"]).slice(0, 10)
      : [],
  };
}
