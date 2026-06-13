import Link from "next/link";

export const metadata = {
  title: "Terms of Use · MoneyOS",
  description: "Draft terms of use for MoneyOS (development phase).",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-primary hover:underline">
          ← Back to MoneyOS
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Terms of Use (Draft)
      </h1>
      <p className="mt-2 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
        Development draft — not legal advice. Features and security controls may
        change. Sandbox only — not live bank data.
      </p>

      <article className="prose prose-invert mt-8 max-w-none space-y-4 text-sm text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <section>
          <h2>Informational service</h2>
          <p>
            MoneyOS helps you view bills, income, spending, and alerts. It is
            not financial, tax, or legal advice.
          </p>
        </section>
        <section>
          <h2>No money movement</h2>
          <p>
            MoneyOS does not initiate payments or transfers. Bank linking via
            Plaid is read-only aggregation.
          </p>
        </section>
        <section>
          <h2>Development status</h2>
          <p>
            The product is in active development. Production security is not
            fully implemented. See{" "}
            <code className="text-xs">
              docs/security/PRODUCTION_READINESS_CHECKLIST.md
            </code>
            .
          </p>
        </section>
        <section>
          <h2>Full draft</h2>
          <p>
            See{" "}
            <code className="text-xs">docs/TERMS_OF_USE_DRAFT.md</code> in the
            repository.
          </p>
        </section>
      </article>
    </main>
  );
}
