const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  // Linked from every sign-in and sign-up page ("you agree to our Terms and
  // Privacy Policy"). Guarded, a signed-out visitor got the login form instead,
  // and the page's own prefetch of each link spent the /login rate limit.
  "/terms",
  "/privacy",
  // Fleet's release receipt contains only the deployed source SHA, lockfile
  // digest, and immutable first-party artifact identities. Rollout automation
  // needs this exact static file to verify what the canary serves.
  "/.well-known/fleet-release.json",
  // The install manifest and the tab icon: a browser fetches them signed out.
  "/manifest.webmanifest",
  "/icon.svg",
];

const PUBLIC_PREFIXES = [
  "/app-icons/", // install icons named by the manifest
  "/api/auth",
  "/api/health",
  "/api/v1",
  "/api/cron", // cron routes self-authenticate via CRON_SECRET (box systemd timers)
  "/onboarding",
  "/invite",
  "/circular-economy",
  "/how-it-works",
  "/why-kivvi",
  "/for",
  "/knowledge",
  "/faq",
  "/about",
  "/orgs",
  "/impressum",
  "/datenschutz",
  "/shop",
];

export function isPublicPath(
  pathname: string,
  nodeEnv: string | undefined,
  chatkitSmokeEnabled: string | undefined,
): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    (nodeEnv !== "production" && chatkitSmokeEnabled === "true" && pathname === "/smoke/chatkit")
  );
}
