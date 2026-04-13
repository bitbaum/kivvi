import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitConfig } from "@/lib/rate-limit";

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
    const onboardingComplete = (req.auth as any)?.user?.onboardingComplete;
    return NextResponse.redirect(
      new URL(onboardingComplete ? "/dashboard" : "/onboarding", req.url),
    );
  }

  // Onboarding redirects for authenticated users
  if (isAuthenticated) {
    // Justified: next-auth middleware types don't include custom session fields
    const onboardingComplete = (req.auth as any)?.user?.onboardingComplete;
    const isOnboardingPath = pathname.startsWith("/onboarding");

    // Not done onboarding + not on onboarding page → redirect to onboarding
    if (
      !onboardingComplete &&
      !isOnboardingPath &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Done onboarding + on onboarding page → redirect to dashboard
    if (onboardingComplete && isOnboardingPath) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
