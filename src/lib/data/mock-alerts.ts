import type { Alert } from "@/lib/types/money";

export const mockAlerts: Alert[] = [
  {
    id: "cc-variable",
    severity: "warning",
    title: "Credit card payment is variable",
    description:
      "The amount changes month to month — confirm the balance before the 19th and leave buffer.",
  },
  {
    id: "cc-source",
    severity: "warning",
    title: "Credit card is paid from Savings",
    description:
      "Review whether this should move to the Bills/Checking account instead of Savings.",
  },
  {
    id: "prime-review",
    severity: "info",
    title: "Amazon Prime needs review",
    description: "Decide whether Prime still justifies its $14/mo.",
  },
  {
    id: "capcut-review",
    severity: "info",
    title: "CapCut needs review",
    description: "Confirm CapCut is still used in the CapCut + Outlook bundle.",
  },
  {
    id: "home-insurance-future",
    severity: "info",
    title: "Home insurance obligation on Sep 3, 2026",
    description:
      "$688 is due 9/3/26 with a remaining balance due end of year — plan ahead.",
  },
  {
    id: "citizens-access",
    severity: "info",
    title: "Citizens school account is mom-managed",
    description:
      "No direct access — it's excluded from available cash. Coordinate with Mom when needed.",
  },
  {
    id: "rumble-commission",
    severity: "warning",
    title: "Rumble income includes commission",
    description:
      "Build the baseline budget on the $350 base only; treat commission as upside.",
  },
  {
    id: "ta-start",
    severity: "info",
    title: "Teaching Assistant income starts Aug 12",
    description:
      "Re-balance the money system once the $800 biweekly income begins.",
  },
];
