import {
  BellRing,
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import type { Alert, AlertSeverity } from "@/lib/types/money";

const config: Record<AlertSeverity, { icon: LucideIcon; tint: string }> = {
  critical: { icon: CircleAlert, tint: "text-destructive bg-destructive/10" },
  warning: { icon: TriangleAlert, tint: "text-warning bg-warning/10" },
  info: { icon: Info, tint: "text-info bg-info/10" },
};

const order: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function MoneyAgentAlerts({ alerts }: { alerts: Alert[] }) {
  const sorted = [...alerts].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );
  const actionable = alerts.filter((a) => a.severity !== "info").length;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={BellRing}
          title="Money Agent Alerts"
          description="Things to decide on or keep an eye on"
          meta={`${actionable} need action · ${alerts.length} total`}
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {sorted.map((alert) => {
            const { icon: Icon, tint } = config[alert.severity];
            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3"
              >
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${tint}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
