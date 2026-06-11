import {
  ArrowRight,
  BellRing,
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { sortAlerts, toneForAlertSeverity } from "@/lib/money-utils";
import type { Alert, AlertSeverity } from "@/lib/types/money";

const iconBySeverity: Record<AlertSeverity, { icon: LucideIcon; tint: string }> = {
  high: { icon: CircleAlert, tint: "text-destructive bg-destructive/10" },
  medium: { icon: TriangleAlert, tint: "text-warning bg-warning/10" },
  low: { icon: Info, tint: "text-info bg-info/10" },
};

export function MoneyAgentAlerts({ alerts }: { alerts: Alert[] }) {
  const sorted = sortAlerts(alerts);
  const reviewNeeded = alerts.filter((a) => a.reviewRequired).length;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={BellRing}
          title="Money Agent Alerts"
          description="Decisions and watch-items, ranked by urgency"
          meta={`${reviewNeeded} need review · ${alerts.length} total`}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((alert) => {
            const { icon: Icon, tint } = iconBySeverity[alert.severity];
            return (
              <div
                key={alert.id}
                className="flex flex-col rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3.5 transition-colors hover:border-foreground/15"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${tint}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge
                    label={alert.severity}
                    tone={toneForAlertSeverity(alert.severity)}
                  />
                  <StatusBadge label={alert.category} tone="neutral" />
                  {alert.reviewRequired && (
                    <StatusBadge label="Review" tone="warning" />
                  )}
                </div>

                <p className="mt-2.5 flex items-start gap-1.5 text-xs text-foreground/80">
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  {alert.suggestedAction}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
