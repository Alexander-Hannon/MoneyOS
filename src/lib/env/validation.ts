import { encryptSecret, decryptSecret } from "@/lib/security/encryption";

/** Safe issue codes — never include secret values. */
export type EnvIssueCode =
  | "missing"
  | "malformed"
  | "invalid_value"
  | "unsupported_environment"
  | "invalid_product"
  | "invalid_country_code"
  | "decrypt_failed"
  | "round_trip_failed";

export type FieldValidation = {
  present: boolean;
  valid: boolean;
  issues: EnvIssueCode[];
};

const PLAID_ENVS = new Set(["sandbox", "development", "production"]);
const MONEYOS_ALLOWED_PLAID_ENV = "sandbox";

const PLAID_PRODUCTS = new Set([
  "assets",
  "auth",
  "balance",
  "identity",
  "identity_verification",
  "income",
  "income_verification",
  "investments",
  "liabilities",
  "payment_initiation",
  "transactions",
  "transfer",
  "employment",
  "standing_orders",
  "signal",
  "statements",
  "processor_payments",
  "processor_identity",
]);

const PLAID_COUNTRY_CODES = new Set([
  "US",
  "GB",
  "ES",
  "NL",
  "FR",
  "IE",
  "CA",
  "DE",
  "IT",
  "PL",
  "DK",
  "NO",
  "SE",
  "EE",
  "LT",
  "LV",
  "PT",
  "BE",
]);

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function validatePlaidClientId(): FieldValidation {
  const value = trimEnv("PLAID_CLIENT_ID");
  const present = Boolean(value);
  if (!present) return { present: false, valid: false, issues: ["missing"] };
  if (value!.length < 8) {
    return { present: true, valid: false, issues: ["malformed"] };
  }
  return { present: true, valid: true, issues: [] };
}

function validatePlaidSecret(): FieldValidation {
  const value = trimEnv("PLAID_SECRET");
  const present = Boolean(value);
  if (!present) return { present: false, valid: false, issues: ["missing"] };
  if (value!.length < 8) {
    return { present: true, valid: false, issues: ["malformed"] };
  }
  return { present: true, valid: true, issues: [] };
}

function validatePlaidEnv(): FieldValidation & { value: string | null } {
  const raw = trimEnv("PLAID_ENV") ?? "sandbox";
  const issues: EnvIssueCode[] = [];
  if (!PLAID_ENVS.has(raw)) {
    issues.push("invalid_value");
  }
  if (raw !== MONEYOS_ALLOWED_PLAID_ENV) {
    issues.push("unsupported_environment");
  }
  return {
    present: Boolean(trimEnv("PLAID_ENV")),
    valid: issues.length === 0,
    issues,
    value: raw,
  };
}

function parseCsvEnv(name: string, fallback: string): string[] {
  return (trimEnv(name) ?? fallback)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function validatePlaidProducts(): FieldValidation & { values: string[] } {
  const values = parseCsvEnv("PLAID_PRODUCTS", "transactions");
  const issues: EnvIssueCode[] = [];
  if (values.length === 0) issues.push("missing");
  for (const product of values) {
    if (!PLAID_PRODUCTS.has(product)) {
      issues.push("invalid_product");
      break;
    }
  }
  return {
    present: Boolean(trimEnv("PLAID_PRODUCTS")),
    valid: issues.length === 0,
    issues,
    values,
  };
}

function validatePlaidCountryCodes(): FieldValidation & { values: string[] } {
  const values = parseCsvEnv("PLAID_COUNTRY_CODES", "US");
  const issues: EnvIssueCode[] = [];
  if (values.length === 0) issues.push("missing");
  for (const code of values) {
    if (!/^[A-Z]{2}$/.test(code) || !PLAID_COUNTRY_CODES.has(code)) {
      issues.push("invalid_country_code");
      break;
    }
  }
  return {
    present: Boolean(trimEnv("PLAID_COUNTRY_CODES")),
    valid: issues.length === 0,
    issues,
    values,
  };
}

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

export function validateEncryptionKey(): FieldValidation {
  const value = trimEnv("PLAID_TOKEN_ENCRYPTION_KEY");
  if (!value) return { present: false, valid: false, issues: ["missing"] };
  if (!decodeEncryptionKey(value)) {
    return { present: true, valid: false, issues: ["malformed"] };
  }
  return { present: true, valid: true, issues: [] };
}

export function validateEncryptionRoundTrip(): boolean {
  if (!validateEncryptionKey().valid) return false;
  try {
    const sample = "moneyos-encryption-self-test";
    return decryptSecret(encryptSecret(sample)) === sample;
  } catch {
    return false;
  }
}

function validateDatabaseUrl(): FieldValidation {
  const value = trimEnv("DATABASE_URL");
  if (!value) return { present: false, valid: false, issues: ["missing"] };
  if (!/^postgres(ql)?:\/\//i.test(value)) {
    return { present: true, valid: false, issues: ["malformed"] };
  }
  return { present: true, valid: true, issues: [] };
}

function validateClerkPublishableKey(): FieldValidation {
  const value = trimEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (!value) return { present: false, valid: false, issues: ["missing"] };
  if (!/^pk_(test|live)_/.test(value)) {
    return { present: true, valid: false, issues: ["malformed"] };
  }
  return { present: true, valid: true, issues: [] };
}

function validateClerkSecretKey(): FieldValidation {
  const value = trimEnv("CLERK_SECRET_KEY");
  if (!value) return { present: false, valid: false, issues: ["missing"] };
  if (!/^sk_(test|live)_/.test(value)) {
    return { present: true, valid: false, issues: ["malformed"] };
  }
  return { present: true, valid: true, issues: [] };
}

function validateGeminiApiKey(): FieldValidation {
  const value = trimEnv("GEMINI_API_KEY");
  if (!value) return { present: false, valid: false, issues: ["missing"] };
  if (value.length < 20) {
    return { present: true, valid: false, issues: ["malformed"] };
  }
  return { present: true, valid: true, issues: [] };
}

function issueLabel(prefix: string, field: FieldValidation): string[] {
  return field.issues.map((issue) => `${prefix}_${issue}`);
}

export type MoneyOSEnvDiagnostics = {
  plaidConfigured: boolean;
  plaidConfigValid: boolean;
  plaidEnv: string | null;
  plaidProducts: string[];
  plaidCountryCodes: string[];
  databaseConfigured: boolean;
  authConfigured: boolean;
  encryptionConfigured: boolean;
  encryptionKeyValid: boolean;
  encryptionRoundTripOk: boolean;
  aiProvider: string;
  geminiConfigured: boolean;
  issues: string[];
  warnings: string[];
};

export function validateMoneyOSEnv(): MoneyOSEnvDiagnostics {
  const clientId = validatePlaidClientId();
  const secret = validatePlaidSecret();
  const plaidEnv = validatePlaidEnv();
  const products = validatePlaidProducts();
  const countryCodes = validatePlaidCountryCodes();
  const encryptionKey = validateEncryptionKey();
  const database = validateDatabaseUrl();
  const clerkPublishable = validateClerkPublishableKey();
  const clerkSecret = validateClerkSecretKey();
  const geminiKey = validateGeminiApiKey();

  const aiProvider = (trimEnv("AI_PROVIDER") ?? "mock").toLowerCase();

  const plaidConfigured = clientId.present && secret.present;
  const plaidConfigValid =
    clientId.valid &&
    secret.valid &&
    plaidEnv.valid &&
    products.valid &&
    countryCodes.valid;

  const issues: string[] = [
    ...issueLabel("plaid_client_id", clientId),
    ...issueLabel("plaid_secret", secret),
    ...issueLabel("plaid_env", plaidEnv),
    ...issueLabel("plaid_products", products),
    ...issueLabel("plaid_country_codes", countryCodes),
    ...issueLabel("database_url", database),
    ...issueLabel("clerk_publishable_key", clerkPublishable),
    ...issueLabel("clerk_secret_key", clerkSecret),
    ...issueLabel("plaid_token_encryption_key", encryptionKey),
  ];

  if (aiProvider === "gemini") {
    issues.push(...issueLabel("gemini_api_key", geminiKey));
  }

  const encryptionRoundTripOk = validateEncryptionRoundTrip();
  if (encryptionKey.valid && !encryptionRoundTripOk) {
    issues.push("plaid_token_encryption_key_round_trip_failed");
  }

  const warnings: string[] = [];

  if (database.present && database.valid && !encryptionKey.valid) {
    warnings.push(
      "database_configured_without_encryption_key",
    );
  }

  if (database.present && database.valid && encryptionKey.valid) {
    warnings.push(
      "shared_database_requires_matching_encryption_key_across_devices",
    );
  }

  if (plaidConfigured && !plaidConfigValid) {
    warnings.push("plaid_partially_configured");
  }

  if (plaidEnv.value && plaidEnv.value !== MONEYOS_ALLOWED_PLAID_ENV) {
    warnings.push("plaid_env_not_sandbox");
  }

  return {
    plaidConfigured,
    plaidConfigValid,
    plaidEnv: plaidEnv.value,
    plaidProducts: products.values,
    plaidCountryCodes: countryCodes.values,
    databaseConfigured: database.present && database.valid,
    authConfigured: clerkPublishable.valid && clerkSecret.valid,
    encryptionConfigured: encryptionKey.valid,
    encryptionKeyValid: encryptionKey.valid,
    encryptionRoundTripOk,
    aiProvider,
    geminiConfigured: aiProvider === "gemini" ? geminiKey.valid : false,
    issues,
    warnings,
  };
}

/** Returns true when Plaid API calls are likely to succeed. */
export function isPlaidEnvValid(): boolean {
  return validateMoneyOSEnv().plaidConfigValid;
}
