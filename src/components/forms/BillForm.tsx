"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Bill, BillAmountType, BillFrequency, BillStatus } from "@/types/money";

type DraftBill = Omit<Bill, "id">;

const today = () => new Date().toISOString().slice(0, 10);

export function BillForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Bill;
  onSubmit: (draft: DraftBill) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amountType, setAmountType] = useState<BillAmountType>(
    initial?.amountType ?? "fixed",
  );
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? today());
  const [frequency, setFrequency] = useState<BillFrequency>(
    initial?.frequency ?? "monthly",
  );
  const [autopay, setAutopay] = useState(initial?.autopay ?? false);
  const [paidFrom, setPaidFrom] = useState(initial?.paidFrom ?? "");
  const [status, setStatus] = useState<BillStatus>(initial?.status ?? "unpaid");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [paymentUrl, setPaymentUrl] = useState(initial?.paymentUrl ?? "");
  const [paymentInstructions, setPaymentInstructions] = useState(
    initial?.paymentInstructions ?? "",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initial?.paymentMethod ?? "",
  );
  const [payeeName, setPayeeName] = useState(initial?.payeeName ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amountRequired = amountType !== "variable";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!dueDate) next.dueDate = "Due date is required.";
    if (amountRequired) {
      const value = Number(amount);
      if (!amount || !Number.isFinite(value) || value <= 0) {
        next.amount = "Enter an amount greater than 0.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: name.trim(),
      amount: amountRequired ? Number(amount) : amount ? Number(amount) : null,
      amountType,
      dueDate,
      frequency,
      autopay,
      paidFrom: paidFrom.trim() || "Unassigned",
      status,
      notes: notes.trim() || undefined,
      paymentUrl: paymentUrl.trim() || undefined,
      paymentInstructions: paymentInstructions.trim() || undefined,
      paymentMethod: paymentMethod.trim() || undefined,
      payeeName: payeeName.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Bill name" required error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent / Mortgage" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount type">
          <Select
            value={amountType}
            onChange={(e) => setAmountType(e.target.value as BillAmountType)}
          >
            <option value="fixed">Fixed</option>
            <option value="estimate">Estimate</option>
            <option value="variable">Variable</option>
          </Select>
        </Field>
        <Field
          label="Amount"
          required={amountRequired}
          error={errors.amount}
          hint={amountRequired ? undefined : "Optional for variable bills"}
        >
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1100"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Due date" required error={errors.dueDate}>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Frequency">
          <Select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as BillFrequency)}
          >
            <option value="monthly">Monthly</option>
            <option value="biweekly">Biweekly</option>
            <option value="annual">Annual</option>
            <option value="one-time">One-time</option>
            <option value="variable">Variable</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Paid from">
          <Input
            value={paidFrom}
            onChange={(e) => setPaidFrom(e.target.value)}
            placeholder="Bills Account"
          />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as BillStatus)}>
            <option value="unpaid">Unpaid</option>
            <option value="scheduled">Scheduled</option>
            <option value="paid">Paid</option>
            <option value="review">Review</option>
          </Select>
        </Field>
      </div>

      <Checkbox
        label="On autopay"
        checked={autopay}
        onChange={(e) => setAutopay(e.target.checked)}
      />

      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
      </Field>

      <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Payment details (optional)
        </p>
        <Field label="Payment URL" hint="Opens in a new tab — MoneyOS does not pay automatically">
          <Input
            type="url"
            value={paymentUrl}
            onChange={(e) => setPaymentUrl(e.target.value)}
            placeholder="https://pay.example.com"
          />
        </Field>
        <Field label="Payee name">
          <Input
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            placeholder="Utility company"
          />
        </Field>
        <Field label="Payment method">
          <Input
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="ACH / card / check"
          />
        </Field>
        <Field label="Payment instructions">
          <Textarea
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="Login steps, account number last 4, etc."
          />
        </Field>
        <p className="text-[11px] text-muted-foreground">
          MoneyOS opens payment links only. It does not pay bills automatically.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add bill"}</Button>
      </div>
    </form>
  );
}
