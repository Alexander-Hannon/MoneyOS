import { selfTestPlaidCredentialRouting } from "../src/lib/plaid/credential-routing";

const result = selfTestPlaidCredentialRouting();

if (!result.ok) {
  console.error("Plaid credential routing self-test failed:");
  for (const failure of result.failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("Plaid credential routing self-test passed.");
