import { clearPlaidSession, hasPlaidSession } from "@/lib/plaid/token-store";
import { isPlaidConfigured } from "@/lib/plaid/client";

export async function POST() {
  if (!isPlaidConfigured()) {
    return Response.json({
      configured: false,
      ok: false,
      message:
        "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to enable sandbox.",
    });
  }

  if (!hasPlaidSession()) {
    return Response.json({
      configured: true,
      ok: true,
      connected: false,
      message: "No active sandbox session.",
    });
  }

  clearPlaidSession();

  return Response.json({
    configured: true,
    ok: true,
    connected: false,
    message: "Sandbox session disconnected. Access token removed from server memory.",
  });
}
