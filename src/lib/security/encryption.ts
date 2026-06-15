import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function decodeEncryptionKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const base64 = Buffer.from(trimmed, "base64");
    if (base64.length === 32) return base64;
  } catch {
    // fall through
  }

  try {
    const hex = Buffer.from(trimmed, "hex");
    if (hex.length === 32) return hex;
  } catch {
    // fall through
  }

  return null;
}

function getEncryptionKey(): Buffer | null {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  return decodeEncryptionKey(raw);
}

export function isEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null;
}

/** Encrypt a server-side secret (e.g. Plaid access token). Returns base64 blob. */
export function encryptSecret(plainText: string): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "PLAID_TOKEN_ENCRYPTION_KEY is not configured. Generate with: openssl rand -base64 32",
    );
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/** Decrypt a value produced by encryptSecret. Server-side only. */
export function decryptSecret(cipherText: string): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  const data = Buffer.from(cipherText, "base64");
  if (data.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted payload.");
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
