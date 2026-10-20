"use client";

import { useSession } from "@/context/SessionProvider";

export type { UserStatus } from "@/context/SessionProvider";

/** Shared session status (one fetch app-wide via SessionProvider). */
export function useUserStatus() {
  const { status, loading, refresh } = useSession();
  return { status, loading, refresh };
}
