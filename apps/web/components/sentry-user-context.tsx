import { auth } from "@/lib/auth";

/**
 * Server component — sets Sentry user scope for every authenticated page render.
 * Renders nothing in the DOM. Import in dashboard layout (server boundary needed).
 *
 * Placed in a server component so auth() can be called without "use client".
 */
export async function SentryUserContext() {
  if (!process.env.SENTRY_DSN) return null;

  const session = await auth();
  if (!session?.user) return null;

  // Dynamically import to avoid bundling Sentry in client chunks
  const { setUser } = await import("@sentry/nextjs");
  setUser({
    id: session.user.id,
    email: session.user.email ?? undefined,
    // companyId surfaces in every error — makes cross-tenant debugging instant
    companyId: session.user.companyId,
  });

  return null;
}
