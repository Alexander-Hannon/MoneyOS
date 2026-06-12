"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type {
  Alert,
  AlertCategory,
  AlertSeverity,
} from "@/types/money";

type DraftAlert = Omit<Alert, "id" | "status">;

export function AlertForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Alert;
  onSubmit: (draft: DraftAlert) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [severity, setSeverity] = useState<AlertSeverity>(
    initial?.severity ?? "medium",
  );
  const [category, setCategory] = useState<AlertCategory>(
    initial?.category ?? "review",
  );
  const [suggestedAction, setSuggestedAction] = useState(
    initial?.suggestedAction ?? "",
  );
  const [reviewRequired, setReviewRequired] = useState(
    initial?.reviewRequired ?? true,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required.";
    if (!suggestedAction.trim()) next.suggestedAction = "Suggested action is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      severity,
      category,
      suggestedAction: suggestedAction.trim(),
      reviewRequired,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" required error={errors.title}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Review subscription bundle" />
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's going on?"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Severity">
          <Select value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as AlertCategory)}>
            <option value="bill">Bill</option>
            <option value="subscription">Subscription</option>
            <option value="income">Income</option>
            <option value="account">Account</option>
            <option value="spending">Spending</option>
            <option value="review">Review</option>
          </Select>
        </Field>
      </div>

      <Field label="Suggested action" required error={errors.suggestedAction}>
        <Input
          value={suggestedAction}
          onChange={(e) => setSuggestedAction(e.target.value)}
          placeholder="Decide whether to keep it"
        />
      </Field>

      <Checkbox
        label="Review required"
        checked={reviewRequired}
        onChange={(e) => setReviewRequired(e.target.checked)}
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add alert"}</Button>
      </div>
    </form>
  );
}
