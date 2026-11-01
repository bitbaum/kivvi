/**
 * The public origin, and absolute URLs on it.
 *
 * Behind Caddy, Node middleware sees the request on the address the app listens
 * on, so `new URL("/login", req.url)` points a visitor at
 * https://localhost:4005/login. Auth.js used to hide that by rebuilding the
 * request from AUTH_URL; on the shared runtime nothing does, and every guarded
 * link a signed-out visitor's browser prefetched redirected off the site
 * (blocked by the CSP, and the deploy's page check saw a page that never
 * settled). Every redirect builds on the configured public URL instead.
 */
export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.NEXTAUTH_URL || env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** `path` (with its query) on the public origin. */
export function publicUrl(path: string, env: NodeJS.ProcessEnv = process.env): URL {
  return new URL(path, `${siteUrl(env)}/`);
}
