import { createHash } from "node:crypto";

/** One-way hash for external Plaid identifiers stored in Postgres. */
export function hashPlaidId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
