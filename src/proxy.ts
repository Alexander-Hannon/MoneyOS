import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function isClerkEnvConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  );
}

const clerkEnabled = isClerkEnvConfigured();

function passThrough() {
  return NextResponse.next();
}

const handler = clerkEnabled ? clerkMiddleware() : passThrough;

export default handler;
export { handler as proxy };

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
