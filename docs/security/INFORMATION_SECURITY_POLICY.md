# Information Security Policy (Draft)

**Status:** Template — not yet approved for production  
**Product:** MoneyOS (private personal finance command center)  
**Effective scope:** Development and Plaid sandbox only until production controls are implemented

## Purpose

This policy defines baseline information security expectations for MoneyOS before any live consumer financial data is processed.

## Current state (honest scope)

MoneyOS is in **active development**. It currently:

- Uses local mock/manual data editable in the browser (`localStorage`)
- Supports **Plaid sandbox only** (no live bank connections)
- Stores Plaid sandbox access tokens in a **dev-only in-memory server store** (lost on restart)
- Has **no production authentication**, **no encrypted database**, and **no formal logging/audit pipeline**

**Do not use live consumer financial data until the production readiness checklist is complete.**

## Security principles

1. **Least privilege** — access only what is needed to operate the product.
2. **Defense in depth** — secrets server-side, HTTPS in production, encryption at rest for tokens.
3. **Transparency** — users must consent before bank linking; privacy and deletion processes must be documented.
4. **No secrets in the client** — Plaid client ID/secret and access tokens never ship to the browser or `localStorage`.

## Data classification

| Class | Examples | Handling today | Production requirement |
|-------|----------|----------------|------------------------|
| Public | UI copy, docs | OK in repo | OK in repo |
| Internal | Architecture notes | Repo + private hosting | Access-controlled |
| Sensitive | Manual bills/income in localStorage | User device only | Auth + encrypted storage |
| Restricted | Plaid access tokens, account numbers | Server memory (dev) | Encrypted DB + auth |

## Roles (solo-founder baseline)

- **Owner / engineer:** full dev access; responsible for patching, incidents, and access removal.
- **Future:** separate admin vs. application runtime credentials.

## Required before live launch

- Authentication with MFA before Plaid Link
- HTTPS everywhere
- Encrypted database with encrypted Plaid tokens
- Consent tracking and privacy policy
- Vulnerability scanning and patch SLA
- Incident response and deletion workflows

## Review

This document is a **starter template**. Review and sign off before public launch or Plaid production approval.
