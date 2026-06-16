import { StatusBadge } from "@/components/shared/StatusBadge";
import type { DataConfidenceLevel } from "@/lib/data-confidence";
import { toneForDashboardStatus } from "@/lib/money-utils";
import type { DashboardStatus } from "@/types/money";

export function DataConfidenceBadge({
  level,
  className,
}: {
  level: DataConfidenceLevel;
  className?: string;
}) {
  const tone =
    level === "High"
      ? "success"
      : level === "Medium"
        ? "info"
        : level === "Low"
          ? "warning"
          : "neutral";

  return (
    <StatusBadge
      label={`Data confidence: ${level}`}
      tone={tone}
      className={className}
    />
  );
}

export function StatusBadgeFromLabel({ status }: { status: DashboardStatus }) {
  return (
    <StatusBadge
      label={status}
      tone={toneForDashboardStatus(status)}
      className="px-3 py-1 text-sm"
    />
  );
}
