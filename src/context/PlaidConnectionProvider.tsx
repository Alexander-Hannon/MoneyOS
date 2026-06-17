"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePlaidLink } from "react-plaid-link";
import { PlaidConsentDialog } from "@/components/plaid/PlaidConsentDialog";
import { LivePlaidConsentDialog } from "@/components/plaid/LivePlaidConsentDialog";
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import type { PlaidLinkTarget } from "@/lib/plaid/plaid-env";

export type StartPlaidConnectionArgs = {
  environment: PlaidLinkTarget;
};

type PlaidConnectionContextValue = {
  startPlaidConnection: (args: StartPlaidConnectionArgs) => void;
  linkBusy: boolean;
  linkError: string | null;
};

const PlaidConnectionContext = createContext<PlaidConnectionContextValue | null>(
  null,
);

function formatLinkTokenError(data: Record<string, unknown>): string {
  if (typeof data.message === "string" && data.message) return data.message;
  if (data.errorCode === "environment_required") {
    return "Plaid environment is required (sandbox or production).";
  }
  if (data.errorCode === "live_plaid_disabled") {
    return "Personal live Plaid is disabled on this server.";
  }
  if (data.errorCode === "live_user_not_allowed") {
    return "Your account is not authorized for personal live Plaid.";
  }
  if (typeof data.plaidErrorMessage === "string" && data.plaidErrorMessage) {
    const code =
      typeof data.plaidErrorCode === "string" ? ` (${data.plaidErrorCode})` : "";
    return `${data.plaidErrorMessage}${code}`;
  }
  if (typeof data.error === "string" && data.error) return data.error;
  return "Could not start the Plaid connection.";
}

type LinkTokenState =
  | { status: "idle" }
  | { status: "loading"; environment: PlaidLinkTarget }
  | { status: "ready"; environment: PlaidLinkTarget; token: string }
  | { status: "error"; environment: PlaidLinkTarget; message: string };

export function PlaidConnectionProvider({ children }: { children: ReactNode }) {
  const fd = useFinancialData();
  const appMode = useAppMode();
  const [sandboxConsentOpen, setSandboxConsentOpen] = useState(false);
  const [liveConsentOpen, setLiveConsentOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<PlaidLinkTarget>("sandbox");
  const [tokenState, setTokenState] = useState<LinkTokenState>({ status: "idle" });
  const [linkError, setLinkError] = useState<string | null>(null);
  const [awaitingLinkOpen, setAwaitingLinkOpen] = useState(false);
  const pendingHandled = useRef(false);

  const fetchLinkToken = useCallback(async (environment: PlaidLinkTarget) => {
    setTokenState({ status: "loading", environment });
    setLinkError(null);
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment }),
      });
      const data = await res.json();
      if (!res.ok || data.configured === false || data.ok === false || !data.link_token) {
        const message = formatLinkTokenError(data);
        setTokenState({ status: "error", environment, message });
        setLinkError(message);
        setAwaitingLinkOpen(false);
        return false;
      }
      setTokenState({ status: "ready", environment, token: data.link_token });
      return true;
    } catch {
      const message = "Could not reach the Plaid endpoint.";
      setTokenState({ status: "error", environment, message });
      setLinkError(message);
      setAwaitingLinkOpen(false);
      return false;
    }
  }, []);

  const token =
    tokenState.status === "ready" && tokenState.environment === linkTarget
      ? tokenState.token
      : null;

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      setSandboxConsentOpen(false);
      setLiveConsentOpen(false);
      setAwaitingLinkOpen(false);
      appMode.clearPendingPlaidConnect();
      void fd.handleLinkSuccess(publicToken, linkTarget);
    },
  });

  const startPlaidConnection = useCallback((args: StartPlaidConnectionArgs) => {
    const { environment } = args;
    setLinkTarget(environment);
    setLinkError(null);
    if (environment === "production") {
      setLiveConsentOpen(true);
    } else {
      setSandboxConsentOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!awaitingLinkOpen) return;
    if (
      tokenState.status === "ready" &&
      tokenState.environment === linkTarget &&
      ready
    ) {
      open();
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- open Plaid Link once token + script are ready */
      setAwaitingLinkOpen(false);
    }
  }, [awaitingLinkOpen, tokenState, linkTarget, ready, open]);

  useEffect(() => {
    if (
      !appMode.pendingPlaidConnect ||
      fd.plaidConnected ||
      pendingHandled.current
    ) {
      return;
    }

    pendingHandled.current = true;
    const environment =
      appMode.pendingPlaidEnvironment ??
      (appMode.storedMode === "personal_live" ? "production" : "sandbox");
    startPlaidConnection({ environment });
  }, [
    appMode.pendingPlaidConnect,
    appMode.pendingPlaidEnvironment,
    appMode.storedMode,
    fd.plaidConnected,
    startPlaidConnection,
  ]);

  const beginLinkAfterConsent = (environment: PlaidLinkTarget) => {
    setAwaitingLinkOpen(true);
    void fetchLinkToken(environment);
  };

  const onSandboxConsentAccept = () => {
    appMode.recordPlaidConsent();
    setSandboxConsentOpen(false);
    beginLinkAfterConsent("sandbox");
  };

  const onLiveConsentAccept = () => {
    appMode.recordPlaidConsent();
    setLiveConsentOpen(false);
    beginLinkAfterConsent("production");
  };

  const linkBusy =
    fd.busy ||
    tokenState.status === "loading" ||
    (awaitingLinkOpen && tokenState.status === "ready" && !ready);

  const value = useMemo(
    () => ({
      startPlaidConnection,
      linkBusy,
      linkError,
    }),
    [startPlaidConnection, linkBusy, linkError],
  );

  return (
    <PlaidConnectionContext.Provider value={value}>
      <PlaidConsentDialog
        open={sandboxConsentOpen}
        onClose={() => {
          setSandboxConsentOpen(false);
          appMode.clearPendingPlaidConnect();
        }}
        onAccept={onSandboxConsentAccept}
        busy={linkBusy}
      />
      <LivePlaidConsentDialog
        open={liveConsentOpen}
        onClose={() => {
          setLiveConsentOpen(false);
          appMode.clearPendingPlaidConnect();
        }}
        onAccept={onLiveConsentAccept}
        busy={linkBusy}
      />
      {children}
    </PlaidConnectionContext.Provider>
  );
}

export function usePlaidConnection(): PlaidConnectionContextValue {
  const ctx = useContext(PlaidConnectionContext);
  if (!ctx) {
    throw new Error(
      "usePlaidConnection must be used within a PlaidConnectionProvider",
    );
  }
  return ctx;
}

/** True when personal live connect should be the primary Spending/header CTA. */
export function shouldShowLiveConnectPrimary(args: {
  livePlaidEnabled: boolean;
  liveUserAllowed: boolean;
  storedMode?: string;
}): boolean {
  if (args.storedMode === "personal_live") return true;
  return args.livePlaidEnabled && args.liveUserAllowed;
}
