import {
  isClerkConfigured,
  isDatabaseConfigured,
} from "@/lib/auth/config";
import { getOptionalAuthUser } from "@/lib/auth/session";

export async function GET() {
  const authUser = await getOptionalAuthUser();

  return Response.json({
    ok: true,
    authConfigured: isClerkConfigured(),
    databaseConfigured: isDatabaseConfigured(),
    signedIn: Boolean(authUser),
    storageMode: authUser
      ? "database"
      : "localStorage",
    user: authUser
      ? {
          email: authUser.email,
          displayName: authUser.displayName,
        }
      : null,
  });
}
