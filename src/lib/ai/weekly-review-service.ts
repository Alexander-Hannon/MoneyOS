import type { AIConfig } from "@/lib/ai/types";
import type {
  WeeklyReviewInput,
  WeeklyReviewOutput,
  ReminderDraft,
} from "@/types/weekly-review";
import { getAIConfig } from "@/lib/ai/money-agent-service";
import { geminiWeeklyReview } from "@/lib/ai/providers/gemini-weekly-review";

function scoreFromStatus(status: string): number {
  switch (status) {
    case "Stable":
      return 88;
    case "Watch":
      return 76;
    case "Tight":
      return 62;
    case "Danger":
      return 42;
    case "Review Needed":
      return 55;
    default:
      return 28;
  }
}

function defaultReminderDrafts(): ReminderDraft[] {
  return [
    {
      id: "reminder-weekly",
      label: "Weekly review habit",
      suggestion: "Run Weekly Money Review every Sunday at 6:00 PM",
      channel: "calendar",
    },
    {
      id: "reminder-bills",
      label: "Bills check-in",
      suggestion: "Review bills due this week every Monday morning",
      channel: "todoist",
    },
  ];
}

function mockWeeklyReview(input: WeeklyReviewInput): WeeklyReviewOutput {
  const score = scoreFromStatus(input.status);
  const whatMattersMost =
    input.setupProgress.readyForWeeklyUse === false
      ? [
          `Setup ${input.setupProgress.complete}/${input.setupProgress.total} — finish core items for higher confidence.`,
          `Cash available: $${input.cashAvailable.toLocaleString()}`,
          `Best next: ${input.bestNextAction}`,
        ]
      : [
          `Status: ${input.status} · Cash $${input.cashAvailable.toLocaleString()}`,
          `Bills due 14d: $${input.billsDue14.toLocaleString()} (${input.billsDue14Count})`,
          `Income expected 14d: $${input.incomeExpected14.toLocaleString()}`,
        ];

  const obligations = [
    `7 days: $${input.billsDue7.toLocaleString()} (${input.billsDue7Count} bills)`,
    `14 days: $${input.billsDue14.toLocaleString()} (${input.billsDue14Count} bills)`,
    `30 days: $${input.billsDue30.toLocaleString()} (${input.billsDue30Count} bills)`,
  ];

  const spending = [
    `Monthly recurring: $${input.monthlyRecurring.toLocaleString()}`,
    `Subscriptions needing review: ${input.subscriptionsNeedingReview}`,
    `Trials ending soon: ${input.trialsEndingSoon}`,
    `Spending Later due soon: ${input.spendingLaterDueSoon}`,
  ];

  const risks: string[] = [];
  if (input.dataConfidence === "Setup Needed") {
    risks.push("Data confidence is low — complete setup before major decisions.");
  }
  if (input.billsDue7 > input.cashAvailable) {
    risks.push("Bills due this week may exceed available cash.");
  }
  if (input.reviewItemCount > 0) {
    risks.push(`${input.reviewItemCount} items need review/classification.`);
  }
  if (risks.length === 0) {
    risks.push("No urgent risks detected — maintain weekly review habit.");
  }

  return {
    weeklyScore: score,
    status: input.status,
    whatMattersMost,
    obligationsSnapshot: obligations,
    spendingSnapshot: spending,
    risks,
    firstThreeActions: input.firstThreeActions,
    bestNextAction: input.bestNextAction,
    summary: `${input.status} week. Cash $${input.cashAvailable.toLocaleString()}, bills 14d $${input.billsDue14.toLocaleString()}, income 14d $${input.incomeExpected14.toLocaleString()}. ${input.modeContext}`,
    provider: "mock",
    mock: true,
    modeNotice: input.modeContext,
    reminderDrafts: defaultReminderDrafts(),
  };
}

export async function generateWeeklyReview(
  input: WeeklyReviewInput,
): Promise<WeeklyReviewOutput> {
  const config = getAIConfig();
  if (config.provider === "mock" || !config.configured) {
    return mockWeeklyReview(input);
  }
  if (config.provider === "gemini") {
    try {
      return await geminiWeeklyReview(config, input);
    } catch {
      return mockWeeklyReview(input);
    }
  }
  return mockWeeklyReview(input);
}

export function sanitizeWeeklyReviewInput(
  body: unknown,
): WeeklyReviewInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.status !== "string") return null;
  return b as unknown as WeeklyReviewInput;
}

export type { AIConfig };
