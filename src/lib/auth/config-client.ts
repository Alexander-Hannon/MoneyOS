/** Client-side Clerk availability (publishable key only). */

export function isClerkPublishableConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}
