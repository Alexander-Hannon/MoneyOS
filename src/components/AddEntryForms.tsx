"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "bill" | "income" | "subscription";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder-white/40 outline-none focus:border-sky-400/70";
const labelClass = "mb-1 block text-xs font-medium text-white/60";

export function AddEntryForms() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bill");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(endpoint: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold">Add an entry</h2>
      <div className="mb-4 flex gap-1 rounded-xl bg-black/30 p-1 text-sm">
        {(["bill", "income", "subscription"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={`flex-1 rounded-lg px-3 py-1.5 capitalize transition ${
              tab === t ? "bg-sky-500 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {tab === "bill" && <BillForm busy={busy} onSubmit={submit} />}
      {tab === "income" && <IncomeForm busy={busy} onSubmit={submit} />}
      {tab === "subscription" && (
        <SubscriptionForm busy={busy} onSubmit={submit} />
      )}
    </section>
  );
}

type SubmitFn = (
  endpoint: string,
  payload: Record<string, unknown>,
) => Promise<boolean>;

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-1 w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
    >
      {busy ? "Saving…" : label}
    </button>
  );
}

function BillForm({ busy, onSubmit }: { busy: boolean; onSubmit: SubmitFn }) {
  return (
    <form
      data-testid="bill-form"
      className="grid grid-cols-2 gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const ok = await onSubmit("bills", {
          name: fd.get("name"),
          amount: fd.get("amount"),
          dueDay: fd.get("dueDay"),
          category: fd.get("category"),
          autopay: fd.get("autopay") === "on",
        });
        if (ok) form.reset();
      }}
    >
      <div className="col-span-2">
        <label className={labelClass}>Bill name</label>
        <input name="name" className={inputClass} placeholder="Rent" required />
      </div>
      <div>
        <label className={labelClass}>Amount ($/mo)</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          placeholder="1850"
          required
        />
      </div>
      <div>
        <label className={labelClass}>Due day</label>
        <input
          name="dueDay"
          type="number"
          min="1"
          max="28"
          defaultValue="1"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Category</label>
        <input name="category" className={inputClass} placeholder="Housing" />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-white/70">
        <input name="autopay" type="checkbox" className="accent-sky-500" />
        Autopay
      </label>
      <div className="col-span-2">
        <SubmitButton busy={busy} label="Add bill" />
      </div>
    </form>
  );
}

function IncomeForm({ busy, onSubmit }: { busy: boolean; onSubmit: SubmitFn }) {
  return (
    <form
      data-testid="income-form"
      className="grid grid-cols-2 gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const ok = await onSubmit("income", {
          source: fd.get("source"),
          amount: fd.get("amount"),
          frequency: fd.get("frequency"),
        });
        if (ok) form.reset();
      }}
    >
      <div className="col-span-2">
        <label className={labelClass}>Source</label>
        <input name="source" className={inputClass} placeholder="Salary" required />
      </div>
      <div>
        <label className={labelClass}>Amount ($)</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          placeholder="5200"
          required
        />
      </div>
      <div>
        <label className={labelClass}>Frequency</label>
        <select name="frequency" defaultValue="monthly" className={inputClass}>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div className="col-span-2">
        <SubmitButton busy={busy} label="Add income" />
      </div>
    </form>
  );
}

function SubscriptionForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: SubmitFn;
}) {
  return (
    <form
      data-testid="subscription-form"
      className="grid grid-cols-2 gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const ok = await onSubmit("subscriptions", {
          name: fd.get("name"),
          amount: fd.get("amount"),
          billingCycle: fd.get("billingCycle"),
          category: fd.get("category"),
        });
        if (ok) form.reset();
      }}
    >
      <div className="col-span-2">
        <label className={labelClass}>Service</label>
        <input name="name" className={inputClass} placeholder="Netflix" required />
      </div>
      <div>
        <label className={labelClass}>Amount ($)</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
          placeholder="15.49"
          required
        />
      </div>
      <div>
        <label className={labelClass}>Billing cycle</label>
        <select name="billingCycle" defaultValue="monthly" className={inputClass}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className={labelClass}>Category</label>
        <input
          name="category"
          className={inputClass}
          placeholder="Entertainment"
        />
      </div>
      <div className="col-span-2">
        <SubmitButton busy={busy} label="Add subscription" />
      </div>
    </form>
  );
}
