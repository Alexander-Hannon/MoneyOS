import { decryptSecret } from "@/lib/security/encryption";
import { getPrisma } from "@/lib/db/prisma";

export type StoredEncryptionHealth = {
  hasStoredTokens: boolean;
  decryptOk: boolean | null;
};

/** Test whether the current encryption key can decrypt stored Plaid tokens. */
export async function checkStoredEncryptionHealth(
  userId: string | null,
): Promise<StoredEncryptionHealth> {
  if (!userId) {
    return { hasStoredTokens: false, decryptOk: null };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { hasStoredTokens: false, decryptOk: null };
  }

  const item = await prisma.plaidItem.findFirst({
    where: {
      userId,
      status: "connected",
      disconnectedAt: null,
      accessTokenEncrypted: { not: null },
    },
    select: { accessTokenEncrypted: true },
  });

  if (!item?.accessTokenEncrypted) {
    return { hasStoredTokens: false, decryptOk: null };
  }

  try {
    decryptSecret(item.accessTokenEncrypted);
    return { hasStoredTokens: true, decryptOk: true };
  } catch {
    return { hasStoredTokens: true, decryptOk: false };
  }
}
