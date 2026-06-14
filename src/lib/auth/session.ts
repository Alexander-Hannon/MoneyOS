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

export async function getOptionalAuthUser(): Promise<AuthenticatedDbUser | null> {
  if (!isClerkConfigured() || !isDatabaseConfigured()) return null;

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const clerk = await currentUser();
  const user = await upsertUserFromClerk({
    clerkUserId,
    email: clerk?.primaryEmailAddress?.emailAddress ?? null,
    displayName: clerk?.fullName ?? clerk?.username ?? null,
  });

  return {
    clerkUserId,
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

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
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

  const clerk = await currentUser();
  const user = await upsertUserFromClerk({
    clerkUserId,
    email: clerk?.primaryEmailAddress?.emailAddress ?? null,
    displayName: clerk?.fullName ?? clerk?.username ?? null,
  });

  return {
    ok: true,
    user: {
      clerkUserId,
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
