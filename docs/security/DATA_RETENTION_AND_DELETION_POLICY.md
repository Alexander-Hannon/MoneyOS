# Data Retention and Deletion Policy (Draft)

**Status:** Template — development phase  
**Product:** MoneyOS

## Purpose

Describe what data MoneyOS stores, how long it is kept, and how users can request deletion.

## Current data stores

| Data | Location | Retention today | Notes |
|------|----------|-----------------|-------|
| Manual bills/income/subscriptions/alerts | Browser `localStorage` | Until user resets | Not synced to server |
| Mock transactions | In-app defaults | Until refresh | Not persisted |
| Plaid sandbox access token | Server memory | Until disconnect or server restart | **Not production-safe** |
| Plaid sandbox accounts/transactions | Fetched on demand | Not persisted server-side | Display only in session |

## Retention principles (production target)

1. **Store only what the product needs** to show dashboards and alerts.
2. **Minimize token lifetime** — refresh/sync as needed; revoke on disconnect.
3. **Define TTLs** for cached transactions and audit logs.
4. **Support user-initiated deletion** of linked accounts and associated data.

## Deletion workflow (target)

1. User clicks **Disconnect** → revoke Plaid item / delete access token server-side.
2. User requests **Delete my data** → purge user row, encrypted tokens, cached transactions, and audit references (where legally allowed).
3. Confirm deletion via authenticated action; log the event (without sensitive payloads).

## Backups

- **Production:** encrypted backups with defined retention (e.g., 30 days) and tested restore.
- **Development:** no backup requirement for sandbox tokens.

## Legal / compliance notes

- Publish a privacy policy before collecting live financial data.
- Honor applicable deletion requests (CCPA-style “delete my data” flow when applicable).

## Review

Template — implement technical deletion endpoints and DB cascades before live launch.
