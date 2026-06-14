"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkPublishableConfigured } from "@/lib/auth/config-client";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  if (!isClerkPublishableConfigured()) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
