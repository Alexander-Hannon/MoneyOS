"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppMode, ModeDisplayLabel, OnboardingChoice } from "@/types/app-mode";
import type { ConsentRecord } from "@/types/user";
import {
  getModeDisplayLabel,
  loadOnboardingCompleted,
  resolveEffectiveMode,
} from "@/lib/app-mode";
import {
  loadBoolean,
  loadConsentHistory,
  newId,
  saveBoolean,
  saveConsentHistory,
  saveString,
  STORAGE_KEYS,
} from "@/lib/storage/local-storage";
import { useMoneyData } from "@/lib/storage/store";

const CONSENT_VERSION = "2026-06-draft";
const PLAID_SCOPES = [
  "accounts",
  "balances",
  "transactions",
  "recurring transactions",
  "liabilities",
  "investments",
];

export interface AppModeContextValue {
  hydrated: boolean;
  storedMode: AppMode;
  effectiveMode: AppMode;
  modeLabel: ModeDisplayLabel;
  onboardingCompleted: boolean;
  showOnboarding: boolean;
  consentHistory: ConsentRecord[];
  pendingPlaidConnect: boolean;
  completeOnboarding: (choice: OnboardingChoice) => void;
  requestPlaidConnect: () => void;
  recordPlaidConsent: () => ConsentRecord;
  clearPendingPlaidConnect: () => void;
  refreshConsentHistory: () => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({
  children,
  plaidConnected = false,
}: {
  children: ReactNode;
  plaidConnected?: boolean;
}) {
  const money = useMoneyData();
  const [hydrated, setHydrated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [consentHistory, setConsentHistory] = useState<ConsentRecord[]>([]);
  const [pendingPlaidConnect, setPendingPlaidConnect] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOnboardingCompleted(loadOnboardingCompleted());
    setConsentHistory(loadConsentHistory());
    setPendingPlaidConnect(loadBoolean(STORAGE_KEYS.pendingPlaidConnect));
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const storedMode = money.appMode;
  const effectiveMode = resolveEffectiveMode(storedMode, plaidConnected);
  const modeLabel = getModeDisplayLabel(storedMode, plaidConnected);

  const refreshConsentHistory = useCallback(() => {
    setConsentHistory(loadConsentHistory());
  }, []);

  const recordPlaidConsent = useCallback((): ConsentRecord => {
    const record: ConsentRecord = {
      id: newId("consent"),
      userId: "local-dev-user",
      consentType: "plaid_link",
      acceptedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
      textSummary:
        "User accepted Plaid sandbox connection consent before opening Link.",
      dataScopes: PLAID_SCOPES,
      plaidProducts: ["transactions"],
    };
    const next = [record, ...loadConsentHistory()].slice(0, 20);
    saveConsentHistory(next);
    setConsentHistory(next);

    void fetch("/api/user/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentType: record.consentType,
        acceptedAt: record.acceptedAt,
        version: record.version,
        textSummary: record.textSummary,
        dataScopes: record.dataScopes,
        plaidProducts: record.plaidProducts,
      }),
    }).catch(() => {
      // Local-only when auth/database is unavailable or user is signed out.
    });

    return record;
  }, []);

  const completeOnboarding = useCallback(
    (choice: OnboardingChoice) => {
      if (choice === "demo") {
        money.loadDemoData();
      } else {
        money.startFresh();
      }
      saveBoolean(STORAGE_KEYS.onboardingCompleted, true);
      setOnboardingCompleted(true);
      if (choice === "connect_sandbox") {
        saveString(STORAGE_KEYS.pendingPlaidConnect, "true");
        setPendingPlaidConnect(true);
      }
    },
    [money],
  );

  const requestPlaidConnect = useCallback(() => {
    saveString(STORAGE_KEYS.pendingPlaidConnect, "true");
    setPendingPlaidConnect(true);
  }, []);

  const clearPendingPlaidConnect = useCallback(() => {
    saveString(STORAGE_KEYS.pendingPlaidConnect, "false");
    setPendingPlaidConnect(false);
  }, []);

  const value = useMemo<AppModeContextValue>(
    () => ({
      hydrated: money.hydrated && hydrated,
      storedMode,
      effectiveMode,
      modeLabel,
      onboardingCompleted,
      showOnboarding: money.hydrated && hydrated && !onboardingCompleted,
      consentHistory,
      pendingPlaidConnect,
      completeOnboarding,
      requestPlaidConnect,
      recordPlaidConsent,
      clearPendingPlaidConnect,
      refreshConsentHistory,
    }),
    [
      money.hydrated,
      hydrated,
      storedMode,
      effectiveMode,
      modeLabel,
      onboardingCompleted,
      consentHistory,
      pendingPlaidConnect,
      completeOnboarding,
      requestPlaidConnect,
      recordPlaidConsent,
      clearPendingPlaidConnect,
      refreshConsentHistory,
    ],
  );

  return (
    <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
  );
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return ctx;
}
