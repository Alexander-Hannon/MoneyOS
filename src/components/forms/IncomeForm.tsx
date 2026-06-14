"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type {
  IncomeAmountType,
  IncomeFrequency,
  IncomeSource,
  Reliability,
} from "@/types/money";

type DraftIncome = Omit<IncomeSource, "id">;

export function IncomeForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: IncomeSource;
  onSubmit: (draft: DraftIncome) => void;
  onCancel: () => void;
}) {
  const [source, setSource] = useState(initial?.source ?? "");
  const [amountType, setAmountType] = useState<IncomeAmountType>(
    initial?.amountType ?? "fixed",
  );
  const [expectedAmount, setExpectedAmount] = useState(
    initial?.expectedAmount != null ? String(initial.expectedAmount) : "",
  );
  const [frequency, setFrequency] = useState<IncomeFrequency>(
    initial?.frequency ?? "monthly",
  );
  const [reliability, setReliability] = useState<Reliability>(
    initial?.reliability ?? "medium",
  );
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amountKnown = amountType !== "unknown";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!source.trim()) next.source = "Source is required.";
    if (amountKnown && expectedAmount) {
      const value = Number(expectedAmount);
      if (!Number.isFinite(value) || value < 0) {
        next.expectedAmount = "Enter a valid amount.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      source: source.trim(),
      expectedAmount: expectedAmount ? Number(expectedAmount) : null,
      amountType,
      frequency,
      reliability,
      active,
      startDate: startDate || undefined,
      nextDate: initial?.nextDate,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Source" required error={errors.source}>
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Primary job income" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount type">
          <Select
            value={amountType}
            onChange={(e) => setAmountType(e.target.value as IncomeAmountType)}
          >
            <option value="fixed">Fixed</option>
            <option value="commission">Commission</option>
            <option value="variable">Variable</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>
        <Field
          label="Expected amount"
          error={errors.expectedAmount}
          hint={amountKnown ? undefined : "Optional when unknown"}
        >
          <Input
            type="number"
            step="0.01"
            min="0"
            value={expectedAmount}
            onChange={(e) => setExpectedAmount(e.target.value)}
            placeholder="350"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Frequency">
          <Select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="semester">Per semester</option>
            <option value="annual">Annual</option>
            <option value="variable">Variable</option>
            <option value="as-needed">As needed</option>
          </Select>
        </Field>
        <Field label="Reliability">
          <Select
            value={reliability}
            onChange={(e) => setReliability(e.target.value as Reliability)}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="variable">Variable</option>
          </Select>
        </Field>
      </div>

      <Field label="Start date" hint="Leave blank if already active">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>

      <Checkbox
        label="Active now"
        checked={active}
        onChange={(e) => setActive(e.target.checked)}
      />

      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add income"}</Button>
      </div>
    </form>
  );
}
