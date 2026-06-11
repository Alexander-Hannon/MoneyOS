import {
  BellRing,
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MoneyAlert, Severity } from "@/lib/types";

const severityConfig: Record<
  Severity,
  { icon: LucideIcon; tint: string; badge: "destructive" | "warning" | "info" }
> = {
  critical: { icon: CircleAlert, tint: "text-destructive bg-destructive/10", badge: "destructive" },
  warning: { icon: TriangleAlert, tint: "text-warning bg-warning/10", badge: "warning" },
  info: { icon: Info, tint: "text-info bg-info/10", badge: "info" },
};

export function MoneyAgentAlerts({ alerts }: { alerts: MoneyAlert[] }) {
  const allClear = alerts.length === 1 && alerts[0].kind === "all-clear";
  const actionable = alerts.filter((a) => a.kind !== "all-clear").length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BellRing className="size-4 text-primary" />
          Money Agent Alerts
        </CardTitle>
        {!allClear && <Badge variant="secondary">{actionable} active</Badge>}
      </CardHeader>
      <CardContent className="space-y-2.5">
        {allClear ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3.5 py-4">
            <CircleCheck className="size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              No urgent actions. Everything looks disciplined.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = severityConfig[alert.severity];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3"
              >
                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${cfg.tint}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{alert.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
                  <Badge variant={cfg.badge} className="mt-2">
                    {alert.action}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
