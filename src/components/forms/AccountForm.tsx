"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type { Account, AccountType } from "@/types/money";
import { defaultIncludeInCashAvailable } from "@/lib/money-utils";

type DraftAccount = Omit<Account, "id" | "createdAt" | "updatedAt" | "source">;

export function AccountForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Account;
  onSubmit: (draft: DraftAccount) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "checking");
  const [balance, setBalance] = useState(
    initial?.balance != null ? String(initial.balance) : "",
  );
  const [availableBalance, setAvailableBalance] = useState(
    initial?.availableBalance != null ? String(initial.availableBalance) : "",
  );
  const [accessible, setAccessible] = useState(
    initial?.accessible ?? defaultIncludeInCashAvailable(type),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Account name is required.";
    const value = Number(balance);
    if (!Number.isFinite(value)) next.balance = "Enter a valid balance.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: name.trim(),
      institution: institution.trim() || undefined,
      type,
      balance: value,
      availableBalance: availableBalance ? Number(availableBalance) : undefined,
      accessible,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Account name" required error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Primary checking" />
      </Field>
      <Field label="Institution" hint="Optional">
        <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Local bank" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account type">
          <Select
            value={type}
            onChange={(e) => {
              const next = e.target.value as AccountType;
              setType(next);
              if (!initial) setAccessible(defaultIncludeInCashAvailable(next));
            }}
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="cash">Cash</option>
            <option value="credit">Credit card</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Current balance" required error={errors.balance}>
          <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
      </div>
      <Field label="Available balance" hint="Optional — used for cash total when set">
        <Input
          type="number"
          step="0.01"
          value={availableBalance}
          onChange={(e) => setAvailableBalance(e.target.value)}
        />
      </Field>
      <Checkbox
        label="Include in total cash available"
        checked={accessible}
        onChange={(e) => setAccessible(e.target.checked)}
      />
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initial ? "Save changes" : "Add account"}</Button>
      </div>
    </form>
  );
}
