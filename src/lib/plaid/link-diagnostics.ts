import type {
  PlaidLinkError,
  PlaidLinkOnEventMetadata,
  PlaidLinkOnExitMetadata,
  PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";
import type { PlaidLinkTarget } from "@/lib/plaid/plaid-env";

export type PlaidLinkExitDiagnostics = {
  headline: string;
  detail: string | null;
  errorType: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  displayMessage: string | null;
  requestId: string | null;
  linkSessionId: string | null;
  institutionName: string | null;
  institutionId: string | null;
  status: string | null;
  institutionSelected: boolean;
  showInstitutionFallback: boolean;
  environment: PlaidLinkTarget;
};

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildPlaidExitDiagnostics(args: {
  error: PlaidLinkError | null;
  metadata: PlaidLinkOnExitMetadata;
  environment: PlaidLinkTarget;
}): PlaidLinkExitDiagnostics {
  const institutionName = safeString(args.metadata.institution?.name);
  const institutionId = safeString(args.metadata.institution?.institution_id);
  const institutionSelected = Boolean(institutionName || institutionId);
  const errorCode = safeString(args.error?.error_code);
  const errorMessage = safeString(args.error?.error_message);
  const displayMessage = safeString(args.error?.display_message);

  const detail =
    displayMessage ??
    errorMessage ??
    (institutionSelected
      ? `${institutionName ?? "Selected institution"} closed before connection completed.`
      : null);

  return {
    headline: "Plaid Link closed before connection completed.",
    detail,
    errorType: safeString(args.error?.error_type),
    errorCode,
    errorMessage,
    displayMessage,
    requestId: safeString(args.metadata.request_id),
    linkSessionId: safeString(args.metadata.link_session_id),
    institutionName,
    institutionId,
    status: safeString(args.metadata.status),
    institutionSelected,
    showInstitutionFallback: institutionSelected,
    environment: args.environment,
  };
}

export function logPlaidLinkExit(
  diagnostics: PlaidLinkExitDiagnostics,
): void {
  console.warn("[MoneyOS Plaid Link] onExit", {
    environment: diagnostics.environment,
    error_type: diagnostics.errorType,
    error_code: diagnostics.errorCode,
    error_message: diagnostics.errorMessage,
    display_message: diagnostics.displayMessage,
    request_id: diagnostics.requestId,
    link_session_id: diagnostics.linkSessionId,
    institution_name: diagnostics.institutionName,
    institution_id: diagnostics.institutionId,
    status: diagnostics.status,
  });
}

export function logPlaidLinkEvent(
  eventName: string,
  metadata: PlaidLinkOnEventMetadata,
): void {
  if (process.env.NODE_ENV !== "development") return;

  console.info("[MoneyOS Plaid Link] onEvent", eventName, {
    institution_id: metadata.institution_id,
    institution_name: metadata.institution_name,
    error_type: metadata.error_type,
    error_code: metadata.error_code,
    error_message: metadata.error_message,
    exit_status: metadata.exit_status,
    view_name: metadata.view_name,
    link_session_id: metadata.link_session_id,
    request_id: metadata.request_id,
  });
}

export function logPlaidLinkSuccess(
  metadata: PlaidLinkOnSuccessMetadata,
  environment: PlaidLinkTarget,
): void {
  console.info("[MoneyOS Plaid Link] onSuccess", {
    environment,
    institution_name: metadata.institution?.name ?? null,
    institution_id: metadata.institution?.institution_id ?? null,
    link_session_id: metadata.link_session_id,
    account_count: metadata.accounts.length,
  });
}
