import { CircleDollarSign } from "lucide-react";

export function Header() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary ring-1 ring-primary/20">
            <CircleDollarSign className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight">
              Money<span className="text-primary">OS</span>
            </p>
            <p className="text-xs text-muted-foreground">
              AJ Money Command Center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline-block">
            Manual / mock data
          </span>
          <p className="text-xs text-muted-foreground sm:text-sm">{today}</p>
        </div>
      </div>
    </header>
  );
}
