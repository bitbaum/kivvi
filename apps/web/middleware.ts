import { authJsMiddleware } from "@/lib/auth";
import { sharedAuthEnabled } from "@/lib/accountkit/runtime";
import { sharedSessionFor } from "@/lib/accountkit/session";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import type { Session } from "next-auth";
import { checkRateLimit, getClientIp, getRateLimitConfig } from "@/lib/rate-limit";
import { moduleForPath, isModuleEnabled } from "@kivvi/core/src/config/modules";
import { isPublicPath } from "@/lib/security/public-paths";
import { isPrefetchRequest, withoutSessionRefresh } from "@/lib/security/session-refresh";

/** Kivvi's routing for one request, given who (if anyone) is signed in. */
function route(req: NextRequest, session: Session | null) {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!session;

  // Handle CORS preflight for the public REST API
  if (req.method === "OPTIONS" && pathname.startsWith("/api/v1")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
        "Retry-After": String(rateLimitResult.retryAfterSeconds),
      },
    });
  }

  // Check if public
  const isPublic = isPublicPath(pathname, process.env.NODE_ENV, process.env.KIVVI_CHATKIT_SMOKE);

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const companyId = session?.user?.companyId;
    const onboardingComplete = session?.user?.onboardingComplete;
    let dest = "/onboarding";
    if (!companyId) dest = "/join";
    else if (onboardingComplete) dest = "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Routing for authenticated users based on company + onboarding state
  if (isAuthenticated) {
    const companyId = session?.user?.companyId;
    const onboardingComplete = session?.user?.onboardingComplete;
    const isOnboardingPath = pathname.startsWith("/onboarding");
    // /join and /invite are the valid holding areas for no-company users
    const isJoinPath = pathname.startsWith("/join") || pathname.startsWith("/invite");

    // No active company → must join or create one before using the app
    if (!companyId && !isJoinPath && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/join", req.url));
    }

    // Has company but hasn't finished onboarding
    if (companyId && !onboardingComplete && !isOnboardingPath && !pathname.startsWith("/api/")) {
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
        const enabledModules = session?.user?.enabledModules;
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
}

const authJsRoute = authJsMiddleware((req) => route(req, req.auth));

// A prefetch in flight at sign-out must not write the session back
// (lib/security/session-refresh.ts).
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // With AUTH_RUNTIME=accountkit the session lives in the database, read here
  // through AccountKit (docs/ACCOUNTKIT-MIGRATION.md); otherwise the Auth.js JWT.
  const response = sharedAuthEnabled()
    ? route(req, await sharedSessionFor(req.headers))
    : // auth()'s wrapper is typed for route handlers too; as middleware it receives (request, event).
      await authJsRoute(req, event as unknown as Parameters<typeof authJsRoute>[1]);
  if (response && isPrefetchRequest(req.headers)) return withoutSessionRefresh(response);
  return response;
}

export const config = {
  // Node, not the edge: the AccountKit session is a database read. Next 15.5
  // runs Node middleware in the same server process as the app.
  runtime: "nodejs",
  // `opengraph-image` and `twitter-image` are Next's generated metadata routes.
  // They were caught by this matcher, so /opengraph-image ran through the app
  // and answered with 243 KB of HTML instead of a PNG — the site advertised a
  // preview that every social scraper then discarded. Metadata routes are
  // assets, not pages, and must bypass middleware like the other static paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|opengraph-image|twitter-image).*)"],
};
