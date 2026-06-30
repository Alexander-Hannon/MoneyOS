"use client";

import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { ActionCenter } from "@/components/dashboard/ActionCenter";

export default function ActionCenterPage() {
  return (
    <TaskPageShell
      title="Action Center"
      description="Unresolved decisions that need your attention"
    >
      <ActionCenter />
    </TaskPageShell>
  );
}
