import type { Alert } from "@/lib/types/money";

export const mockAlerts: Alert[] = [
  {
    id: "cc-source",
    title: "Credit card is auto-paid from Savings",
    description:
      "The variable credit card payment is pulling from the Savings Account instead of Bills or Checking.",
    severity: "high",
    category: "account",
    suggestedAction:
      "Review why the credit card payment comes from savings and decide whether it should move to the Bills Account or Checking.",
    reviewRequired: true,
  },
  {
    id: "cc-variable",
    title: "Credit card payment is variable",
    description:
      "The amount changes month to month, so the budget needs buffer before the 19th.",
    severity: "medium",
    category: "bill",
    suggestedAction: "Confirm the statement balance before the 19th.",
    reviewRequired: true,
  },
  {
    id: "rumble-commission",
    title: "Rumble income includes commission",
    description:
      "Only the $350 base is dependable; commission varies each pay period.",
    severity: "medium",
    category: "income",
    suggestedAction: "Budget on the $350 base and treat commission as upside.",
    reviewRequired: false,
  },
  {
    id: "home-insurance-future",
    title: "Home insurance obligation on Sep 3, 2026",
    description:
      "$688 is due 9/3/26 with a remaining balance due end of year.",
    severity: "medium",
    category: "spending",
    suggestedAction: "Start setting aside ~$115/mo so it's covered by September.",
    reviewRequired: true,
  },
  {
    id: "prime-review",
    title: "Amazon Prime needs review",
    description: "Prime is $14/mo and flagged as a maybe.",
    severity: "low",
    category: "subscription",
    suggestedAction: "Decide whether Prime still earns its keep.",
    reviewRequired: true,
  },
  {
    id: "capcut-review",
    title: "CapCut needs review",
    description: "Confirm CapCut is still used in the CapCut + Outlook bundle.",
    severity: "low",
    category: "subscription",
    suggestedAction: "Keep Outlook; decide on CapCut specifically.",
    reviewRequired: true,
  },
  {
    id: "citizens-access",
    title: "Citizens school account is mom-managed",
    description:
      "No direct access, so it's excluded from available cash.",
    severity: "low",
    category: "account",
    suggestedAction: "Coordinate with Mom before relying on those funds.",
    reviewRequired: false,
  },
  {
    id: "ta-start",
    title: "Teaching Assistant income starts Aug 12",
    description:
      "The $800 biweekly income begins Aug 12 and changes the whole picture.",
    severity: "low",
    category: "income",
    suggestedAction: "Re-balance the money system once the TA income begins.",
    reviewRequired: false,
  },
];
