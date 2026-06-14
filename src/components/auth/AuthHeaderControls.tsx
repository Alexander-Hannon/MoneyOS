"use client";

import Link from "next/link";
import {
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { isClerkPublishableConfigured } from "@/lib/auth/config-client";

export function AuthHeaderControls() {
  if (!isClerkPublishableConfigured()) {
    return (
      <span className="hidden rounded-[var(--radius-md)] border border-border bg-muted/20 px-2 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
        Local Mode
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-[var(--radius-md)] border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            Sign in
          </button>
        </SignInButton>
        <Link
          href="/sign-up"
          className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
        >
          Sign up
        </Link>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-8",
            },
          }}
        />
      </Show>
    </div>
  );
}
