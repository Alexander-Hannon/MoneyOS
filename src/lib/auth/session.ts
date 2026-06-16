import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured, isDatabaseConfigured } from "@/lib/auth/config";
import { getPrisma } from "@/lib/db/prisma";
import { upsertUserFromClerk } from "@/lib/db/users";

export type AuthenticatedDbUser = {
  clerkUserId: string;
  userId: string;
  email: string | null;
  displayName: string | null;
};

export type AuthApiResult =
  | { ok: true; user: AuthenticatedDbUser }
  | { ok: false; status: number; body: Record<string, unknown> };

type ClerkAuthRead =
  | { ok: true; userId: string | null }
  | { ok: false; status: number; body: Record<string, unknown> };

/** Read Clerk session safely — never throws through API handlers. */
async function readClerkAuth(): Promise<ClerkAuthRead> {
  if (!isClerkConfigured()) {
    return { ok: true, userId: null };
  }

  try {
    const { userId } = await auth();
    return { ok: true, userId: userId ?? null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Clerk authentication failed.";

    if (message.includes("clerkMiddleware")) {
      return {
        ok: false,
        status: 503,
        body: {
          error:
            "Clerk middleware is not active. Ensure src/middleware.ts exports clerkMiddleware().",
          configured: false,
          authConfigured: true,
          databaseConfigured: isDatabaseConfigured(),
        },
      };
    }

    return {
      ok: false,
      status: 503,
      body: {
        error: "Clerk authentication is temporarily unavailable.",
        detail: message,
        configured: false,
        authConfigured: true,
        databaseConfigured: isDatabaseConfigured(),
      },
    };
  }
}

async function readClerkUserProfile() {
  try {
    return await currentUser();
  } catch {
    return null;
  }
}

export async function getOptionalAuthUser(): Promise<AuthenticatedDbUser | null> {
  if (!isClerkConfigured() || !isDatabaseConfigured()) return null;

  const authResult = await readClerkAuth();
  if (!authResult.ok) return null;
  if (!authResult.userId) return null;

  const clerk = await readClerkUserProfile();
  const user = await upsertUserFromClerk({
    clerkUserId: authResult.userId,
    email: clerk?.primaryEmailAddress?.emailAddress ?? null,
    displayName: clerk?.fullName ?? clerk?.username ?? null,
  });

  return {
    clerkUserId: authResult.userId,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export async function requireAuthUser(): Promise<AuthApiResult> {
  if (!isClerkConfigured()) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "Authentication is not configured.",
        configured: false,
        authConfigured: false,
        databaseConfigured: isDatabaseConfigured(),
      },
    };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "Database is not configured.",
        configured: false,
        authConfigured: true,
        databaseConfigured: false,
      },
    };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "Database client unavailable.",
        configured: false,
        authConfigured: true,
        databaseConfigured: false,
      },
    };
  }

  const authResult = await readClerkAuth();
  if (!authResult.ok) {
    return { ok: false, status: authResult.status, body: authResult.body };
  }

  if (!authResult.userId) {
    return {
      ok: false,
      status: 401,
      body: {
        error: "Sign in required.",
        configured: true,
        authConfigured: true,
        databaseConfigured: true,
      },
    };
  }

  const clerk = await readClerkUserProfile();
  const user = await upsertUserFromClerk({
    clerkUserId: authResult.userId,
    email: clerk?.primaryEmailAddress?.emailAddress ?? null,
    displayName: clerk?.fullName ?? clerk?.username ?? null,
  });

  return {
    ok: true,
    user: {
      clerkUserId: authResult.userId,
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  };
}

export function authNotConfiguredResponse(): Response {
  return Response.json(
    {
      error: "Auth/database not configured. Using local mode.",
      configured: false,
      authConfigured: isClerkConfigured(),
      databaseConfigured: isDatabaseConfigured(),
    },
    { status: 503 },
  );
}
