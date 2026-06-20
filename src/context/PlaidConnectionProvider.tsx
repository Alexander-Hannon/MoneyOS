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
import {
  usePlaidLink,
  type PlaidLinkError,
  type PlaidLinkOnEventMetadata,
  type PlaidLinkOnExitMetadata,
  type PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";
import { PlaidConsentDialog } from "@/components/plaid/PlaidConsentDialog";
import { LivePlaidConsentDialog } from "@/components/plaid/LivePlaidConsentDialog";
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import type { PlaidLinkTarget } from "@/lib/plaid/plaid-env";
import { useToast } from "@/components/ui/toast";
import {
  buildPlaidExitDiagnostics,
  logPlaidLinkEvent,
  logPlaidLinkExit,
  logPlaidLinkSuccess,
  type PlaidLinkExitDiagnostics,
} from "@/lib/plaid/link-diagnostics";

export type StartPlaidConnectionArgs = {
  environment: PlaidLinkTarget;
};

type PlaidConnectionContextValue = {
  startPlaidConnection: (args: StartPlaidConnectionArgs) => void;
  retryPlaidConnection: () => void;
  tryAnotherInstitution: () => void;
  dismissLinkExit: () => void;
  linkBusy: boolean;
  linkError: string | null;
  linkExitDiagnostics: PlaidLinkExitDiagnostics | null;
  lastEnvironment: PlaidLinkTarget | null;
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

export function PlaidConnectionProvider({ children }: { children: ReactNode }) {
  const fd = useFinancialData();
  const appMode = useAppMode();
  const toast = useToast();
  const [sandboxConsentOpen, setSandboxConsentOpen] = useState(false);
  const [liveConsentOpen, setLiveConsentOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<PlaidLinkTarget>("sandbox");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkExitDiagnostics, setLinkExitDiagnostics] =
    useState<PlaidLinkExitDiagnostics | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const pendingHandled = useRef(false);
  const linkTargetRef = useRef(linkTarget);
  const selectedInstitutionRef = useRef<{
    name: string | null;
    id: string | null;
  }>({ name: null, id: null });

  useEffect(() => {
    linkTargetRef.current = linkTarget;
  }, [linkTarget]);

  const clearLinkSession = useCallback(() => {
    setLinkToken(null);
    setPendingOpen(false);
    setTokenLoading(false);
  }, []);

  const fetchLinkToken = useCallback(async (environment: PlaidLinkTarget) => {
    setTokenLoading(true);
    setLinkError(null);
    setLinkToken(null);
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment }),
      });
      const data = await res.json();
      if (!res.ok || data.configured === false || data.ok === false || !data.link_token) {
        const message = formatLinkTokenError(data);
        setLinkError(message);
        setTokenLoading(false);
        setPendingOpen(false);
        return false;
      }
      setLinkToken(data.link_token);
      setTokenLoading(false);
      return true;
    } catch {
      const message = "Could not reach the Plaid endpoint.";
      setLinkError(message);
      setTokenLoading(false);
      setPendingOpen(false);
      return false;
    }
  }, []);

  const beginFreshLinkSession = useCallback(
    async (environment: PlaidLinkTarget) => {
      clearLinkSession();
      setLinkTarget(environment);
      linkTargetRef.current = environment;
      selectedInstitutionRef.current = { name: null, id: null };
      setPendingOpen(true);
      await fetchLinkToken(environment);
    },
    [clearLinkSession, fetchLinkToken],
  );

  const handleLinkExit = useCallback(
    (error: PlaidLinkError | null, metadata: PlaidLinkOnExitMetadata) => {
      const environment = linkTargetRef.current;
      const exitMeta = { ...metadata };
      if (!exitMeta.institution && selectedInstitutionRef.current.name) {
        exitMeta.institution = {
          name: selectedInstitutionRef.current.name,
          institution_id: selectedInstitutionRef.current.id ?? "",
        };
      }

      const diagnostics = buildPlaidExitDiagnostics({
        error,
        metadata: exitMeta,
        environment,
      });
      logPlaidLinkExit(diagnostics);
      setLinkExitDiagnostics(diagnostics);
      clearLinkSession();
      setSandboxConsentOpen(false);
      setLiveConsentOpen(false);
    },
    [clearLinkSession],
  );

  const handleLinkSuccess = useCallback(
    (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const environment = linkTargetRef.current;
      logPlaidLinkSuccess(metadata, environment);
      setLinkExitDiagnostics(null);
      setSandboxConsentOpen(false);
      setLiveConsentOpen(false);
      clearLinkSession();
      appMode.clearPendingPlaidConnect();
      void fd.handleLinkSuccess(publicToken, environment).then((result) => {
        if (result?.message) {
          toast(result.message);
        }
        clearLinkSession();
      });
    },
    [appMode, clearLinkSession, fd, toast],
  );

  const handleLinkEvent = useCallback(
    (eventName: string, metadata: PlaidLinkOnEventMetadata) => {
      logPlaidLinkEvent(eventName, metadata);
      if (
        eventName === "SELECT_INSTITUTION" ||
        metadata.institution_name ||
        metadata.institution_id
      ) {
        selectedInstitutionRef.current = {
          name: metadata.institution_name,
          id: metadata.institution_id,
        };
      }
    },
    [],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleLinkSuccess,
    onExit: handleLinkExit,
    onEvent: handleLinkEvent,
  });

  useEffect(() => {
    if (!pendingOpen || !linkToken || !ready) return;
    open();
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- open Plaid Link once token + script are ready */
    setPendingOpen(false);
  }, [pendingOpen, linkToken, ready, open]);

  const startPlaidConnection = useCallback(
    (args: StartPlaidConnectionArgs) => {
      const { environment } = args;
      clearLinkSession();
      setLinkError(null);
      setLinkExitDiagnostics(null);
      setLinkTarget(environment);
      linkTargetRef.current = environment;
      if (environment === "production") {
        setLiveConsentOpen(true);
      } else {
        setSandboxConsentOpen(true);
      }
    },
    [clearLinkSession],
  );

  const retryPlaidConnection = useCallback(() => {
    setLinkExitDiagnostics(null);
    void beginFreshLinkSession(linkTargetRef.current);
  }, [beginFreshLinkSession]);

  const tryAnotherInstitution = useCallback(() => {
    retryPlaidConnection();
  }, [retryPlaidConnection]);

  const dismissLinkExit = useCallback(() => {
    setLinkExitDiagnostics(null);
  }, []);

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

  const onSandboxConsentAccept = () => {
    appMode.recordPlaidConsent();
    setSandboxConsentOpen(false);
    void beginFreshLinkSession("sandbox");
  };

  const onLiveConsentAccept = () => {
    appMode.recordPlaidConsent();
    setLiveConsentOpen(false);
    void beginFreshLinkSession("production");
  };

  const linkBusy =
    fd.busy || tokenLoading || (pendingOpen && Boolean(linkToken) && !ready);

  const value = useMemo(
    () => ({
      startPlaidConnection,
      retryPlaidConnection,
      tryAnotherInstitution,
      dismissLinkExit,
      linkBusy,
      linkError,
      linkExitDiagnostics,
      lastEnvironment: linkTarget,
    }),
    [
      startPlaidConnection,
      retryPlaidConnection,
      tryAnotherInstitution,
      dismissLinkExit,
      linkBusy,
      linkError,
      linkExitDiagnostics,
      linkTarget,
    ],
  );

  return (
    <PlaidConnectionContext.Provider value={value}>
      <PlaidConsentDialog
        open={sandboxConsentOpen}
        onClose={() => {
          setSandboxConsentOpen(false);
          clearLinkSession();
          appMode.clearPendingPlaidConnect();
        }}
        onAccept={onSandboxConsentAccept}
        busy={linkBusy}
      />
      <LivePlaidConsentDialog
        open={liveConsentOpen}
        onClose={() => {
          setLiveConsentOpen(false);
          clearLinkSession();
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
