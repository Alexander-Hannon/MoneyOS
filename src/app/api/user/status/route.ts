import { isClerkConfigured, isDatabaseConfigured } from "@/lib/auth/config";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { isEncryptionConfigured } from "@/lib/security/encryption";
import { countActivePlaidItemsForUser } from "@/lib/db/plaid-items";

export async function GET() {
  const authUser = await getOptionalAuthUser();
  const encryptionConfigured = isEncryptionConfigured();
  const persistentPlaidEnabled =
    Boolean(authUser) &&
    isClerkConfigured() &&
    isDatabaseConfigured() &&
    encryptionConfigured;

  let plaidStorageMode: "memory" | "database" | "none" = "none";
  if (authUser && persistentPlaidEnabled) {
    const count = await countActivePlaidItemsForUser(authUser.userId);
    plaidStorageMode = count > 0 ? "database" : "database";
  }

  return Response.json({
    ok: true,
    authConfigured: isClerkConfigured(),
    databaseConfigured: isDatabaseConfigured(),
    encryptionConfigured,
    persistentPlaidEnabled,
    plaidStorageMode,
    signedIn: Boolean(authUser),
    storageMode: authUser ? "database" : "localStorage",
    user: authUser
      ? {
          email: authUser.email,
          displayName: authUser.displayName,
        }
      : null,
  });
}
