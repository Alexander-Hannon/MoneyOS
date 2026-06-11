import { CircleDollarSign } from "lucide-react";

export function Topbar() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary">
            <CircleDollarSign className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight">
              Money<span className="text-primary">OS</span>
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              AJ&apos;s finance command center
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">{today}</p>
      </div>
    </header>
  );
}
