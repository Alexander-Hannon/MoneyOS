import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ModeDisplayLabel } from "@/types/app-mode";

const toneMap: Record<
  ModeDisplayLabel,
  "success" | "info" | "warning" | "neutral"
> = {
  "Demo Mode": "info",
  "Local User Data": "neutral",
  "Plaid Sandbox": "success",
  "Personal Live": "warning",
};

export function ModeBadge({ label }: { label: ModeDisplayLabel }) {
  return (
    <StatusBadge
      label={label}
      tone={toneMap[label]}
      className="hidden text-[10px] sm:inline-flex"
    />
  );
}
