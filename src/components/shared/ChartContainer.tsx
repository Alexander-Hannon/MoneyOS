"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsClientMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/** Wrapper that gives Recharts a stable, non-zero layout box after mount. */
export function ChartContainer({
  children,
  className,
  heightClassName = "h-[320px] min-h-[320px]",
  ready = true,
}: {
  children: ReactNode;
  className?: string;
  heightClassName?: string;
  /** When false, renders a sized placeholder without chart content. */
  ready?: boolean;
}) {
  const mounted = useIsClientMounted();

  const showChart = mounted && ready;

  return (
    <div
      className={cn("relative w-full min-w-0", heightClassName, className)}
      aria-hidden={!showChart}
    >
      {showChart ? children : null}
    </div>
  );
}
