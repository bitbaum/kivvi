/**
 * Auth.js's middleware wrapper re-issues the session cookie on every response
 * that passed through it with a valid session, to slide the expiry forward.
 * That includes a request that was in flight when the person signed out: its
 * response lands after the sign-out's "delete this cookie" and writes the
 * session back. Then /login redirects them to /dashboard, signed in again.
 *
 * The CI traces show prefetches as the requests that do it. The dashboard
 * prefetches every sidebar link, and a prefetch that started before the
 * sign-out finished answers a few milliseconds after it. A prefetch is
 * speculative, so it has no business writing the session. Real navigations
 * and session polls still slide the expiry.
 */

const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?=/;

/** True for a Next.js router prefetch, or a browser speculative prefetch. */
export function isPrefetchRequest(headers: Headers): boolean {
  return (
    headers.get("next-router-prefetch") === "1" ||
    headers.get("purpose") === "prefetch" ||
    (headers.get("sec-purpose") ?? "").includes("prefetch")
  );
}

/** The same response without the session cookie refresh; every other cookie is kept. */
export function withoutSessionRefresh(response: Response): Response {
  const cookies = response.headers.getSetCookie();
  if (!cookies.some((cookie) => SESSION_COOKIE.test(cookie))) return response;
  const out = new Response(response.body, response);
  out.headers.delete("set-cookie");
  for (const cookie of cookies) {
    if (!SESSION_COOKIE.test(cookie)) out.headers.append("set-cookie", cookie);
  }
  return out;
}
