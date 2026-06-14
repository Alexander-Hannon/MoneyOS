# Privacy Policy (Draft)

**Status:** Draft — not legal advice; review with counsel before launch  
**Product:** MoneyOS  
**Last updated:** Phase 6 scaffold

## Overview

MoneyOS is a private personal finance dashboard. This draft describes how data would be handled when the product moves beyond local-only development.

## Current development mode

Today, MoneyOS primarily stores **manual financial entries in your browser** (`localStorage`). Plaid integration uses **sandbox test institutions only**. Sandbox bank data is fetched for display and is **not claimed to be live bank data**.

## Information we may collect (future production)

When you connect a bank via Plaid, MoneyOS may receive:

- Account names, types, masks, and balances
- Transaction history and details
- Recurring transaction patterns (when enabled)
- Liabilities and investment holdings (when enabled)

We also collect account information you enter manually (bills, income, subscriptions, alerts).

## How we use information

- Display dashboards, spending categories, cashflow, and alerts
- Detect recurring charges and items needing review
- **We do not initiate payments or move money**

## What we do not do

- Sell your financial data
- Store Plaid access tokens in your browser or `localStorage`
- Expose Plaid secrets to client-side code

## Data storage and security

- Plaid credentials and access tokens remain **server-side**
- Production will require authentication, HTTPS, and encrypted storage (see `docs/security/SECURE_STORAGE_PLAN.md`)
- Development uses an in-memory token store that resets on server restart

## Your choices

- **Disconnect** sandbox bank connection (header menu)
- **Reset** manual data to defaults (header)
- **Request deletion** — full account deletion workflow planned for production

## Sandbox notice

Plaid sandbox mode is for **testing only**. Do not connect real financial institutions until MoneyOS completes production security controls.

## Contact

Before launch, add a privacy contact email.

## Changes

We will update this policy before collecting live consumer data. Material changes will be communicated in-app.

---

See also: `/privacy` in the app and `docs/security/DATA_RETENTION_AND_DELETION_POLICY.md`.
