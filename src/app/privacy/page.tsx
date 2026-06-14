import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · MoneyOS",
  description: "Privacy policy draft for MoneyOS by Apalym.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-primary hover:underline">
          ← Back to MoneyOS
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Privacy Policy (Draft)
      </h1>
      <p className="mt-2 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
        Development draft for MoneyOS by Apalym — not legal advice. Sandbox /
        demo mode only until production controls are complete.
      </p>

      <article className="prose prose-invert mt-8 max-w-none space-y-4 text-sm text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <section>
          <h2>What MoneyOS collects</h2>
          <p>
            Manual bills, income, subscriptions, and alerts you enter are stored
            in your browser (localStorage). When you connect a Plaid sandbox
            bank, MoneyOS retrieves test account and transaction data via Plaid
            server-side APIs.
          </p>
        </section>
        <section>
          <h2>How data is used</h2>
          <p>
            To show dashboards, spending categories, recurring payment
            candidates, alerts, and review items. MoneyOS does not initiate
            payments or move money.
          </p>
        </section>
        <section>
          <h2>Plaid and tokens</h2>
          <p>
            Plaid client secrets and access tokens stay on the server and are
            never stored in localStorage or sent to other clients. Sandbox mode
            is for testing only.
          </p>
        </section>
        <section>
          <h2>Your choices</h2>
          <ul className="list-disc pl-5">
            <li>Disconnect sandbox bank (header menu)</li>
            <li>Reset manual data (header)</li>
            <li>Request deletion — full workflow planned for production</li>
          </ul>
        </section>
        <section>
          <h2>Full draft</h2>
          <p>
            See{" "}
            <code className="text-xs">docs/PRIVACY_POLICY_DRAFT.md</code> in the
            repository for the complete template.
          </p>
        </section>
      </article>
    </main>
  );
}
