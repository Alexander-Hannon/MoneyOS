"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsClientMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

type ChartSize = { width: number; height: number };

function useMeasuredSize(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!active) return;

    const node = ref.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  return {
    ref,
    size,
    valid: size.width > 0 && size.height > 0,
  };
}

/** Waits for mount + non-zero layout before rendering Recharts children. */
export function SafeResponsiveChart({
  children,
  className,
  heightClassName = "h-[320px] min-h-[320px]",
  ready = true,
}: {
  children: (size: ChartSize) => ReactNode;
  className?: string;
  heightClassName?: string;
  /** When false, renders a sized placeholder without chart content. */
  ready?: boolean;
}) {
  const mounted = useIsClientMounted();
  const active = mounted && ready;
  const { ref, size, valid } = useMeasuredSize(active);

  return (
    <div
      ref={ref}
      className={cn("relative w-full min-w-0", heightClassName, className)}
      aria-hidden={!active || !valid}
    >
      {active && valid ? (
        children(size)
      ) : (
        <div
          className="absolute inset-0 rounded-[var(--radius-md)] bg-muted/30"
          aria-hidden
        />
      )}
    </div>
  );
}
