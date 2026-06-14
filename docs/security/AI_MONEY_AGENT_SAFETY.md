# AI Money Agent Safety Rules

**Status:** Active product policy for MoneyOS AI features  
**Scope:** Money Agent Brief, Explain Alert, Suggest Category, and future AI capabilities

## Core principle

MoneyOS AI is an **analyst and explainer**, not an executor. All outputs are **recommendations for human review**.

## What AI must never do

- **Move money** — no transfers, payments, or account changes
- **Spend money** — no purchase authorization or card usage
- **Invest** — no trade execution, allocation changes, or brokerage actions
- **Make final decisions** — no “you should definitely do X” without review framing
- **Provide tax or legal advice as final authority** — always defer to qualified professionals
- **Access secrets** — no Plaid tokens, API keys, account numbers, or credentials in prompts or logs

## What AI should do

- Separate **facts** (amounts, dates, counts from sanitized summaries) from **assumptions**
- **Flag missing data** when the summary is incomplete
- Produce **review-required** recommendations with clear next steps
- Explain alerts and categories in **plain English**
- Label outputs as **AI-generated guidance**

## User approval required before

The following require explicit human approval — AI may suggest, never execute:

- Money movement (transfers, bill pay, autopay changes)
- Spending commitments (purchases, subscriptions)
- Investing or trading
- Debt payoff or consolidation strategy
- Tax or legal positions
- Major purchases
- Business or contractual financial commitments

## Technical safeguards (implemented)

| Control | Implementation |
|---------|----------------|
| Server-side only | `/api/ai/*` routes; `GEMINI_API_KEY` never sent to client |
| Sanitized inputs | Aggregated summaries only — no tokens or account numbers |
| Mock fallback | `AI_PROVIDER=mock` when key missing — app never crashes |
| No auto-apply | Suggest Category requires user “Approve” click |
| Disclaimers | UI shows “AI-generated guidance. Review before making financial decisions.” |

## Provider configuration

- Default: `AI_PROVIDER=mock` (deterministic demo responses)
- Gemini: `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, optional `AI_MODEL` (default `gemini-2.0-flash`) — server-side only
- Future: `openai`, `groq` with provider-specific keys
- Real providers wired only when env vars present; mock remains fallback on missing config or API errors

## Incident response

If AI outputs unsafe instructions (e.g., “transfer all savings now”):

1. Treat as a product bug — patch prompts and output validation
2. Do not wire auto-execution paths that could act on AI text
3. Document in incident log per `INCIDENT_RESPONSE_PLAN.md`

## Review

Update this document when adding new AI features or connecting live providers.
