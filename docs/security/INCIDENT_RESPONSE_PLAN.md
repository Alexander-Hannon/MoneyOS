# Incident Response Plan (Draft)

**Status:** Template — development phase  
**Product:** MoneyOS

## Scope

Security and privacy incidents affecting MoneyOS users, Plaid integrations, or stored financial data.

## Incident types

- Plaid secret or access token exposure
- Unauthorized access to admin systems
- Data breach (database leak)
- Malicious dependency / supply chain
- Service outage affecting data integrity

## Roles

| Role | Responsibility |
|------|----------------|
| Incident lead (founder) | Triage, containment, communication |
| Engineering | Patch, rotate secrets, restore service |
| Legal/advisor (if needed) | Breach notification guidance |

## Response phases

### 1. Detect & triage (0–4 hours)

- Confirm incident vs. false positive
- Classify severity (P1 token leak, P2 unauthorized access, P3 minor)
- Start incident log (time, systems, data involved)

### 2. Contain (immediate)

- Rotate `PLAID_SECRET` and revoke affected Plaid items
- Disable compromised auth sessions / API keys
- Take affected service offline if needed
- Preserve logs for investigation

### 3. Eradicate & recover

- Deploy fix
- Verify no persistent attacker access
- Restore from clean backup if data corrupted

### 4. Notify

- **Plaid:** follow Plaid security notification requirements if consumer tokens affected
- **Users:** if live consumer data impacted, notify per applicable law and privacy policy
- **Regulators:** if required by jurisdiction

### 5. Post-incident review

- Root cause, timeline, what worked, action items with owners

## Communication templates (prepare before launch)

- Internal status update
- User-facing incident notice (no secrets in message)
- Plaid partner notification

## Testing

Run a tabletop exercise before production: “Plaid token found in client bundle.”

## Review

Template — not operational until logging, on-call, and rotation runbooks exist.
