import type { DashboardStatus } from "@/types/money";
import type { AppMode } from "@/types/app-mode";
import type { AIProvider } from "@/lib/ai/types";

export type WeeklyReviewSourceMode = AppMode | "plaid_sandbox";

export type WeeklyReviewRecord = {
  id: string;
  weekStartDate: string;
  createdAt: string;
  status: DashboardStatus;
  cashAvailable: number;
  billsDue7: number;
  billsDue14: number;
  billsDue30: number;
  incomeExpected14: number;
  monthlyRecurring: number;
  reviewItemCount: number;
  weeklyScore: number;
  summary: string;
  whatMattersMost: string[];
  obligationsSnapshot: string[];
  spendingSnapshot: string[];
  risks: string[];
  firstThreeActions: string[];
  bestNextAction: string;
  userNotes?: string;
  completedActions?: string[];
  sourceMode: WeeklyReviewSourceMode;
  aiProvider: AIProvider;
  dataConfidence: "High" | "Medium" | "Low" | "Setup Needed";
  reminderDrafts?: ReminderDraft[];
};

export type ReminderDraft = {
  id: string;
  label: string;
  suggestion: string;
  channel: "todoist" | "calendar";
};

export type WeeklyReviewOutput = {
  weeklyScore: number;
  status: DashboardStatus;
  whatMattersMost: string[];
  obligationsSnapshot: string[];
  spendingSnapshot: string[];
  risks: string[];
  firstThreeActions: string[];
  bestNextAction: string;
  summary: string;
  provider: AIProvider;
  mock: boolean;
  modeNotice?: string;
  reminderDrafts: ReminderDraft[];
};

export type WeeklyReviewInput = {
  appMode: string;
  modeContext: string;
  dataSource: string;
  dataConfidence: "High" | "Medium" | "Low" | "Setup Needed";
  status: DashboardStatus;
  cashAvailable: number;
  billsDue7: number;
  billsDue7Count: number;
  billsDue14: number;
  billsDue14Count: number;
  billsDue30: number;
  billsDue30Count: number;
  incomeExpected14: number;
  monthlyRecurring: number;
  reviewItemCount: number;
  subscriptionsNeedingReview: number;
  trialsEndingSoon: number;
  spendingLaterDueSoon: number;
  firstThreeActions: string[];
  bestNextAction: string;
  activeAlerts: { title: string; severity: string }[];
  setupProgress: { complete: number; total: number; readyForWeeklyUse: boolean };
};
