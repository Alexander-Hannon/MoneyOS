"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface HighlightContextValue {
  highlightedId: string | null;
  /** Highlight a target element (e.g. an alert) briefly. */
  highlight: (id: string) => void;
}

const HighlightContext = createContext<HighlightContextValue>({
  highlightedId: null,
  highlight: () => {},
});

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlight = useCallback((id: string) => {
    if (timer.current) clearTimeout(timer.current);
    // Reset first so re-highlighting the same id re-triggers the animation.
    setHighlightedId(null);
    requestAnimationFrame(() => setHighlightedId(id));
    timer.current = setTimeout(() => setHighlightedId(null), 2600);
  }, []);

  return (
    <HighlightContext.Provider value={{ highlightedId, highlight }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlight(): HighlightContextValue {
  return useContext(HighlightContext);
}
