import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitConfig } from "@/lib/rate-limit";
import { moduleForPath, isModuleEnabled } from "@kivvi/core/src/config/modules";

// Only these routes are accessible without authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
// Landing pages are public — all start with these prefixes
const PUBLIC_PREFIXES = [
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
  "/impressum",
  "/datenschutz",
  "/shop",
];

function getClientIp(req: { headers: Headers }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Handle CORS preflight for the public REST API
  if (req.method === "OPTIONS" && pathname.startsWith("/api/v1")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const rateLimitConfig = getRateLimitConfig(pathname);
  const rateLimitResult = checkRateLimit(`${ip}:${pathname}`, rateLimitConfig);

  if (!rateLimitResult.allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": Math.ceil(
          rateLimitResult.retryAfterMs / 1000,
        ).toString(),
      },
    });
  }

  // Check if public
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    // Justified: next-auth middleware types don't include custom session fields
    const companyId = (req.auth as any)?.user?.companyId;
    const onboardingComplete = (req.auth as any)?.user?.onboardingComplete;
    let dest = "/onboarding";
    if (!companyId) dest = "/join";
    else if (onboardingComplete) dest = "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Routing for authenticated users based on company + onboarding state
  if (isAuthenticated) {
    // Justified: next-auth middleware types don't include custom session fields
    const companyId = (req.auth as any)?.user?.companyId;
    const onboardingComplete = (req.auth as any)?.user?.onboardingComplete;
    const isOnboardingPath = pathname.startsWith("/onboarding");
    // /join and /invite are the valid holding areas for no-company users
    const isJoinPath =
      pathname.startsWith("/join") || pathname.startsWith("/invite");

    // No active company → must join or create one before using the app
    if (!companyId && !isJoinPath && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/join", req.url));
    }

    // Has company but hasn't finished onboarding
    if (
      companyId &&
      !onboardingComplete &&
      !isOnboardingPath &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Finished onboarding + still on onboarding page → go to dashboard
    if (companyId && onboardingComplete && isOnboardingPath) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Per-tenant module gating: a disabled module's routes are unreachable by
    // direct URL, not just hidden from the sidebar. Undefined enabledModules
    // (legacy default) means all modules on → no redirect.
    if (companyId && onboardingComplete && !pathname.startsWith("/api/")) {
      const mod = moduleForPath(pathname);
      if (mod) {
        // Justified: next-auth middleware types don't include custom fields
        const enabledModules = (req.auth as any)?.user?.enabledModules as
          | string[]
          | null
          | undefined;
        if (!isModuleEnabled(enabledModules ?? undefined, mod)) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
    }
  }

  // Deny-by-default: everything not public requires auth
  if (!isAuthenticated && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
