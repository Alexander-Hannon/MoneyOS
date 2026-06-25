"use client";

import { useState } from "react";
import {
  Archive,
  ArrowRight,
  BellRing,
  CircleAlert,
  CircleCheck,
  Info,
  Plus,
  RotateCcw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RowActions } from "@/components/shared/RowActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExplainAlertButton } from "@/components/ai/ExplainAlertButton";
import { MoneyAgentBrief } from "@/components/ai/MoneyAgentBrief";
import { AlertForm } from "@/components/forms/AlertForm";
import { sortAlerts, toneForAlertSeverity } from "@/lib/money-utils";
import { useActionNavigation } from "@/hooks/useActionNavigation";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { Alert, AlertSeverity, AlertStatus } from "@/types/money";

const iconBySeverity: Record<AlertSeverity, { icon: LucideIcon; tint: string }> = {
  high: { icon: CircleAlert, tint: "text-destructive bg-destructive/10" },
  medium: { icon: TriangleAlert, tint: "text-warning bg-warning/10" },
  low: { icon: Info, tint: "text-info bg-info/10" },
};

const filters: AlertStatus[] = ["active", "reviewed", "archived"];

export function MoneyAgentAlerts() {
  const { alerts, addAlert, updateAlert, setAlertStatus, deleteAlert } =
    useMoneyData();
  const toast = useToast();
  const { navigateToAlert } = useActionNavigation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Alert | null>(null);
  const [filter, setFilter] = useState<AlertStatus>("active");

  const visible = sortAlerts(alerts.filter((a) => a.status === filter));
  const activeReviewCount = alerts.filter(
    (a) => a.status === "active" && a.reviewRequired,
  ).length;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={BellRing}
          title="Money Agent Alerts"
          description="Decisions and watch-items, ranked by urgency"
          meta={`${activeReviewCount} need review`}
          action={
            <div className="flex items-center gap-2">
              <MoneyAgentBrief compact />
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus /> Add
              </Button>
            </div>
          }
        />

        <div className="mb-3 flex gap-1 rounded-[var(--radius-md)] bg-muted/40 p-1 text-xs">
          {filters.map((f) => {
            const count = alerts.filter((a) => a.status === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-[var(--radius-sm)] px-2 py-1 capitalize transition-colors ${
                  filter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title={filter === "active" ? "No alerts yet." : `No ${filter} alerts`}
            description={
              filter === "active"
                ? "Nothing needs a decision right now."
                : `No ${filter} alerts to show.`
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((alert) => {
              const { icon: Icon, tint } = iconBySeverity[alert.severity];
              return (
                <div
                  key={alert.id}
                  id={`alert-card-${alert.id}`}
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
                      {alert.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {alert.description}
                        </p>
                      )}
                    </div>
                    <RowActions
                      label={alert.title}
                      onEdit={() => {
                        setEditing(alert);
                        setOpen(true);
                      }}
                      onDelete={() => {
                        deleteAlert(alert.id);
                        toast("Alert deleted");
                      }}
                    />
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

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-2.5">
                    {alert.reviewRequired && alert.status === "active" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigateToAlert(alert)}
                      >
                        <ArrowRight className="size-3.5" />
                        Review
                      </Button>
                    ) : null}
                    <ExplainAlertButton alert={alert} />
                    {alert.status !== "active" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlertStatus(alert.id, "active");
                          toast("Alert reactivated");
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <RotateCcw className="size-3.5" /> Reactivate
                      </button>
                    )}
                    {alert.status === "active" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlertStatus(alert.id, "reviewed");
                          toast("Marked reviewed");
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-success"
                      >
                        <CircleCheck className="size-3.5" /> Mark reviewed
                      </button>
                    )}
                    {alert.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlertStatus(alert.id, "archived");
                          toast("Alert archived");
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Archive className="size-3.5" /> Archive
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit alert" : "Add alert"}
        description="Stored locally in your browser (demo / manual data)."
      >
        <AlertForm
          initial={editing ?? undefined}
          onCancel={() => setOpen(false)}
          onSubmit={(draft) => {
            if (editing) {
              updateAlert(editing.id, draft);
              toast("Alert updated");
            } else {
              addAlert(draft);
              toast("Alert added");
            }
            setOpen(false);
          }}
        />
      </Dialog>
    </Card>
  );
}
