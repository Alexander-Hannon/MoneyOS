import type { AIConfig } from "@/lib/ai/types";
import type { WeeklyReviewInput, WeeklyReviewOutput } from "@/types/weekly-review";
import {
  MONEY_AGENT_SYSTEM_PROMPT,
  WEEKLY_REVIEW_USER_PROMPT,
} from "@/lib/ai/money-agent-prompts";
import { generateGeminiJson } from "@/lib/ai/providers/gemini-client";

const WEEKLY_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    weeklyScore: { type: "number" },
    summary: { type: "string" },
    whatMattersMost: { type: "array", items: { type: "string" } },
    obligationsSnapshot: { type: "array", items: { type: "string" } },
    spendingSnapshot: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    firstThreeActions: { type: "array", items: { type: "string" } },
    bestNextAction: { type: "string" },
  },
  required: [
    "weeklyScore",
    "summary",
    "whatMattersMost",
    "obligationsSnapshot",
    "spendingSnapshot",
    "risks",
    "firstThreeActions",
    "bestNextAction",
  ],
};

function buildWeeklyReviewPrompt(input: WeeklyReviewInput): string {
  return `Weekly review context (sanitized):
Status: ${input.status}
Data confidence: ${input.dataConfidence}
Cash available: $${input.cashAvailable}
Bills due 7d: $${input.billsDue7} (${input.billsDue7Count})
Bills due 14d: $${input.billsDue14} (${input.billsDue14Count})
Bills due 30d: $${input.billsDue30} (${input.billsDue30Count})
Income expected 14d: $${input.incomeExpected14}
Monthly recurring: $${input.monthlyRecurring}
Review items: ${input.reviewItemCount}
Subscriptions needing review: ${input.subscriptionsNeedingReview}
Trials ending soon: ${input.trialsEndingSoon}
Spending Later due soon: ${input.spendingLaterDueSoon}
Setup progress: ${input.setupProgress.complete}/${input.setupProgress.total}
Deterministic first actions: ${input.firstThreeActions.join(" | ")}
Best next action: ${input.bestNextAction}
Mode: ${input.modeContext}
Active alerts: ${input.activeAlerts.map((a) => a.title).join("; ") || "none"}

Keep each bullet under 120 characters. Max 3 items per list unless risks need more.`;
}

export async function geminiWeeklyReview(
  config: AIConfig,
  input: WeeklyReviewInput,
): Promise<WeeklyReviewOutput> {
  const payload = await generateGeminiJson<{
    weeklyScore: number;
    summary: string;
    whatMattersMost: string[];
    obligationsSnapshot: string[];
    spendingSnapshot: string[];
    risks: string[];
    firstThreeActions: string[];
    bestNextAction: string;
  }>(config, {
    systemPrompt: `${MONEY_AGENT_SYSTEM_PROMPT}\n\n${WEEKLY_REVIEW_USER_PROMPT}`,
    userPrompt: buildWeeklyReviewPrompt(input),
    responseSchema: WEEKLY_REVIEW_SCHEMA,
  });

  return {
    weeklyScore: Math.min(100, Math.max(0, Math.round(payload.weeklyScore))),
    status: input.status,
    whatMattersMost: payload.whatMattersMost.slice(0, 5),
    obligationsSnapshot: payload.obligationsSnapshot.slice(0, 6),
    spendingSnapshot: payload.spendingSnapshot.slice(0, 6),
    risks: payload.risks.slice(0, 5),
    firstThreeActions: payload.firstThreeActions.slice(0, 3),
    bestNextAction: payload.bestNextAction,
    summary: payload.summary,
    provider: "gemini",
    mock: false,
    modeNotice: input.modeContext,
    reminderDrafts: [
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
    ],
  };
}
