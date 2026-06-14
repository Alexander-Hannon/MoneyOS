import type { AppMode } from "@/types/app-mode";

/** Future authenticated user profile — not wired to auth yet. */
export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  createdAt: string;
  onboardingCompleted: boolean;
  appMode: AppMode;
  dataPreferences: UserDataPreferences;
}

export interface UserSettings {
  /** Placeholder for future notification, theme, and privacy toggles. */
  emailNotifications?: boolean;
  showDemoLabels?: boolean;
}

export interface UserDataPreferences {
  /** Prefer demo seed data vs user-managed local data. */
  preferDemoData: boolean;
  /** Allow mixed manual lists when Plaid sandbox is connected. */
  allowMixedSandboxManual: boolean;
}

/**
 * Production consent must be stored server-side in an encrypted database.
 * Local dev records in localStorage are for development scaffolding only.
 */
export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: "plaid_link" | "privacy_policy" | "terms_of_use";
  acceptedAt: string;
  version: string;
  textSummary: string;
  dataScopes: string[];
  plaidProducts?: string[];
  revokedAt?: string;
}

/** Future Plaid institution link — server-side in production. */
export interface ConnectedInstitution {
  id: string;
  userId: string;
  institutionName: string;
  accountCount: number;
  connectedAt: string;
  source: "plaid_sandbox" | "plaid_live";
  status: "connected" | "disconnected" | "error";
}

/** Future user-initiated deletion workflow. */
export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestedAt: string;
  status: "pending" | "processing" | "completed" | "rejected";
  scope: "local_only" | "plaid_items" | "full_account";
  notes?: string;
}
