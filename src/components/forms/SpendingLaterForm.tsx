"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type {
  PlannedExpense,
  PlannedExpensePriority,
  PlannedExpenseStatus,
} from "@/types/money";

type DraftSpendingLater = Omit<PlannedExpense, "id">;

export function SpendingLaterForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: PlannedExpense;
  onSubmit: (draft: DraftSpendingLater) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? initial?.name ?? "");
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [targetDate, setTargetDate] = useState(
    initial?.targetDate?.slice(0, 10) ?? "",
  );
  const [category, setCategory] = useState(initial?.category ?? "General");
  const [priority, setPriority] = useState<PlannedExpensePriority>(
    initial?.priority ?? "medium",
  );
  const [status, setStatus] = useState<PlannedExpenseStatus>(
    initial?.status ?? "planned",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [fundingSource, setFundingSource] = useState(
    initial?.fundingSource ?? "",
  );
  const [reminderDate, setReminderDate] = useState(
    initial?.reminderDate?.slice(0, 10) ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: title.trim(),
      title: title.trim(),
      amount: amount ? Number(amount) : null,
      targetDate: targetDate || undefined,
      category: category.trim() || "General",
      priority,
      status,
      notes: notes.trim() || undefined,
      fundingSource: fundingSource.trim() || undefined,
      reminderDate: reminderDate || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" required error={errors.title}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New tires / vacation fund"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" hint="Optional — leave blank if unknown">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
          />
        </Field>
        <Field label="Category">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Transportation"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target date">
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </Field>
        <Field label="Reminder date">
          <Input
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <Select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as PlannedExpensePriority)
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as PlannedExpenseStatus)
            }
          >
            <option value="planned">Planned</option>
            <option value="saving">Saving</option>
            <option value="scheduled">Scheduled</option>
            <option value="funded">Funded</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </Select>
        </Field>
      </div>

      <Field label="Funding source">
        <Input
          value={fundingSource}
          onChange={(e) => setFundingSource(e.target.value)}
          placeholder="Savings account"
        />
      </Field>

      <Field label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional context"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add item"}</Button>
      </div>
    </form>
  );
}
