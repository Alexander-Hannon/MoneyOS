"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type {
  Subscription,
  SubscriptionFrequency,
  SubscriptionStatus,
} from "@/types/money";

type DraftSubscription = Omit<Subscription, "id">;

export function SubscriptionForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Subscription;
  onSubmit: (draft: DraftSubscription) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [frequency, setFrequency] = useState<SubscriptionFrequency>(
    initial?.frequency ?? "monthly",
  );
  const [category, setCategory] = useState(initial?.category ?? "");
  const [status, setStatus] = useState<SubscriptionStatus>(initial?.status ?? "keep");
  const [renewalDate, setRenewalDate] = useState(
    initial?.renewalDate?.slice(0, 10) ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isTrial, setIsTrial] = useState(initial?.isTrial ?? false);
  const [trialStartDate, setTrialStartDate] = useState(
    initial?.trialStartDate?.slice(0, 10) ?? "",
  );
  const [trialEndDate, setTrialEndDate] = useState(
    initial?.trialEndDate?.slice(0, 10) ?? "",
  );
  const [reminderDaysBeforeTrialEnds, setReminderDaysBeforeTrialEnds] =
    useState(
      initial?.reminderDaysBeforeTrialEnds != null
        ? String(initial.reminderDaysBeforeTrialEnds)
        : "7",
    );
  const [cancellationUrl, setCancellationUrl] = useState(
    initial?.cancellationUrl ?? "",
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    initial?.reminderEnabled ?? true,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value < 0) {
      next.amount = "Enter a valid amount.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: name.trim(),
      amount: Number(amount),
      frequency,
      category: category.trim() || "General",
      status,
      renewalDate: renewalDate || undefined,
      notes: notes.trim() || undefined,
      isTrial,
      trialStartDate: isTrial && trialStartDate ? trialStartDate : undefined,
      trialEndDate: isTrial && trialEndDate ? trialEndDate : undefined,
      reminderDaysBeforeTrialEnds: isTrial
        ? Number(reminderDaysBeforeTrialEnds) || 7
        : undefined,
      cancellationUrl: cancellationUrl.trim() || undefined,
      reminderEnabled,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" required error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" required error={errors.amount}>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20"
          />
        </Field>
        <Field label="Frequency">
          <Select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as SubscriptionFrequency)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
            <option value="variable">Variable</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Entertainment"
          />
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
          >
            <option value="keep">Keep</option>
            <option value="review">Review</option>
            <option value="cancel">Cancel</option>
          </Select>
        </Field>
      </div>

      <Field label="Renewal date" hint="Optional">
        <Input
          type="date"
          value={renewalDate}
          onChange={(e) => setRenewalDate(e.target.value)}
        />
      </Field>

      <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3 space-y-3">
        <Checkbox
          label="This is a free trial"
          checked={isTrial}
          onChange={(e) => setIsTrial(e.target.checked)}
        />
        {isTrial && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trial start">
                <Input
                  type="date"
                  value={trialStartDate}
                  onChange={(e) => setTrialStartDate(e.target.value)}
                />
              </Field>
              <Field label="Trial end" required={isTrial}>
                <Input
                  type="date"
                  value={trialEndDate}
                  onChange={(e) => setTrialEndDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Remind days before trial ends">
              <Input
                type="number"
                min="1"
                max="30"
                value={reminderDaysBeforeTrialEnds}
                onChange={(e) =>
                  setReminderDaysBeforeTrialEnds(e.target.value)
                }
              />
            </Field>
          </>
        )}
        <Field label="Cancel / manage URL" hint="Opens in a new tab — MoneyOS does not cancel automatically">
          <Input
            type="url"
            value={cancellationUrl}
            onChange={(e) => setCancellationUrl(e.target.value)}
            placeholder="https://account.example.com/cancel"
          />
        </Field>
        <Checkbox
          label="Enable renewal reminders"
          checked={reminderEnabled}
          onChange={(e) => setReminderEnabled(e.target.checked)}
        />
      </div>

      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add subscription"}</Button>
      </div>
    </form>
  );
}
