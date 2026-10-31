import { getSession, signOut } from "next-auth/react";

/**
 * Sign out, make sure the session is really gone, then go to /login.
 *
 * A response that was in flight when the sign-out landed can write the session
 * cookie back (lib/security/session-refresh.ts covers prefetches; a server
 * action can do the same). `signOut({ callbackUrl })` would then navigate to
 * /login while still signed in, and the middleware sends the person back to
 * /dashboard. So this asks the server after each sign-out and signs out again
 * while it still answers with a session. Then it leaves the page.
 */
export async function signOutAndLeave(
  destination = "/login",
  deps: {
    signOut: typeof signOut;
    getSession: typeof getSession;
    leave: (url: string) => void;
  } = { signOut, getSession, leave: (url) => window.location.assign(url) },
  attempts = 3,
): Promise<void> {
  try {
    for (let attempt = 0; attempt < attempts; attempt++) {
      await deps.signOut({ redirect: false });
      if (!(await deps.getSession({ broadcast: false }))) break;
    }
  } finally {
    deps.leave(destination);
  }
}
