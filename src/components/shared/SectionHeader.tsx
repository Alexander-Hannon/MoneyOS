import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  icon: Icon,
  meta,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {meta && <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}
