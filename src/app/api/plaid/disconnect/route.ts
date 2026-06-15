import { NextResponse } from "next/server";
import { isPlaidConfigured } from "@/lib/plaid/client";
import {
  clearPlaidSession,
  hasPlaidSession,
} from "@/lib/plaid/token-store";
import { resolvePlaidStorageContext } from "@/lib/plaid/storage-mode";
import { disconnectPlaidItemForUser } from "@/lib/plaid/persistent-items";

// POST /api/plaid/disconnect  { plaidItemId?: string }
export async function POST(request: Request) {
  if (!isPlaidConfigured()) {
    return NextResponse.json({
      configured: false,
      ok: false,
      message:
        "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to enable sandbox.",
    });
  }

  let plaidItemId: string | undefined;
  try {
    const body = await request.json();
    plaidItemId =
      typeof body?.plaidItemId === "string" ? body.plaidItemId : undefined;
  } catch {
    // optional body
  }

  const storage = await resolvePlaidStorageContext();

  if (storage.mode === "database" && storage.userId) {
    if (!plaidItemId) {
      return NextResponse.json(
        {
          configured: true,
          ok: false,
          storageMode: "database",
          error: "plaidItemId is required to disconnect a persisted institution.",
        },
        { status: 400 },
      );
    }

    try {
      await disconnectPlaidItemForUser(storage.userId, plaidItemId);
      return NextResponse.json({
        configured: true,
        ok: true,
        connected: false,
        storageMode: "database",
        message:
          "Sandbox institution disconnected. Historical transactions were kept.",
      });
    } catch (error) {
      return NextResponse.json(
        {
          configured: true,
          ok: false,
          storageMode: "database",
          error:
            error instanceof Error
              ? error.message
              : "Could not disconnect institution.",
        },
        { status: 404 },
      );
    }
  }

  if (!hasPlaidSession()) {
    return NextResponse.json({
      configured: true,
      ok: true,
      connected: false,
      storageMode: "memory",
      message: "No active sandbox session.",
    });
  }

  clearPlaidSession();

  return NextResponse.json({
    configured: true,
    ok: true,
    connected: false,
    storageMode: "memory",
    message:
      "Sandbox session disconnected. Access token removed from server memory.",
  });
}
