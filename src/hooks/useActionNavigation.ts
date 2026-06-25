"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ACTION_DESTINATIONS,
  buildDestinationUrl,
  resolveDestinationKeyForActionItem,
  resolveDestinationKeyForAlert,
  type ActionDestinationKey,
} from "@/lib/action-destinations";
import { scrollToSection } from "@/lib/scroll-nav";
import type { ActionItem } from "@/types/actions";
import type { Alert } from "@/types/money";

export function useActionNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateToKey = useCallback(
    (key: ActionDestinationKey) => {
      if (typeof window === "undefined") return;

      const dest = ACTION_DESTINATIONS[key];
      const url = buildDestinationUrl(dest);

      if (dest.path === "/" && dest.hash && pathname === "/") {
        scrollToSection(dest.hash);
        history.replaceState(null, "", `/#${dest.hash}`);
        return;
      }

      if (dest.path === pathname && dest.hash && !dest.query) {
        scrollToSection(dest.hash);
        history.replaceState(null, "", url);
        return;
      }

      router.push(url);
    },
    [pathname, router],
  );

  const navigateToActionItem = useCallback(
    (item: ActionItem) => {
      if (item.href) {
        window.open(item.href, "_blank", "noopener,noreferrer");
        return;
      }
      navigateToKey(resolveDestinationKeyForActionItem(item));
    },
    [navigateToKey],
  );

  const navigateToAlert = useCallback(
    (alert: Alert) => {
      navigateToKey(resolveDestinationKeyForAlert(alert));
    },
    [navigateToKey],
  );

  return {
    navigateToKey,
    navigateToActionItem,
    navigateToAlert,
  };
}
