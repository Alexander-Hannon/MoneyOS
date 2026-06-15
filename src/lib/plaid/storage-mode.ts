import {
  isAuthDatabaseReady,
  isClerkConfigured,
  isDatabaseConfigured,
} from "@/lib/auth/config";
import { getOptionalAuthUser } from "@/lib/auth/session";
import { isEncryptionConfigured } from "@/lib/security/encryption";

export type PlaidStorageMode = "memory" | "database" | "none";

export type PlaidStorageContext = {
  mode: PlaidStorageMode;
  userId: string | null;
  authConfigured: boolean;
  databaseConfigured: boolean;
  encryptionConfigured: boolean;
  persistentPlaidEnabled: boolean;
};

export function getPlaidStorageFlags() {
  return {
    authConfigured: isClerkConfigured(),
    databaseConfigured: isDatabaseConfigured(),
    encryptionConfigured: isEncryptionConfigured(),
    persistentPlaidEnabled:
      isAuthDatabaseReady() && isEncryptionConfigured(),
  };
}

export async function resolvePlaidStorageContext(): Promise<PlaidStorageContext> {
  const flags = getPlaidStorageFlags();
  const authUser = await getOptionalAuthUser();

  if (flags.persistentPlaidEnabled && authUser) {
    return {
      mode: "database",
      userId: authUser.userId,
      ...flags,
    };
  }

  return {
    mode: "memory",
    userId: authUser?.userId ?? null,
    ...flags,
  };
}
