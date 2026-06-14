import { isClerkConfigured } from "@/lib/auth/config";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">Sign in unavailable</h1>
        <p className="text-sm text-muted-foreground">
          Clerk authentication is not configured. MoneyOS continues in local
          development mode.
        </p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
