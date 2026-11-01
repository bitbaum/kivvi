/**
 * Kivvi's screens on the shared runtime, unchanged.
 *
 * The pages use `next-auth/react` (signIn, signOut, useSession, update). With
 * AUTH_RUNTIME=accountkit those calls are answered here from AccountKit, so no
 * page has to learn a second protocol. AccountKit owns every session and its
 * limiter; Kivvi's own sign-up, reset and password change keep writing
 * `users`, and the mirror triggers carry that to the shared row
 * (docs/ACCOUNTKIT-MIGRATION.md).
 */
import { NextResponse } from "next/server";
import { callShared } from "./call";
import { siteUrl } from "./runtime";
import { sharedSessionFor } from "./session";

const LOGIN_PATH = "/login";

/**
 * AccountKit endpoints Kivvi's screens reach directly. Everything else (its
 * own sign-up, reset and password endpoints, passkeys, factors) stays closed
 * until Kivvi adopts AccountKit's screens: a second credential writer beside
 * Kivvi's would put hashes in `auth_accounts` that `users` never sees.
 */
const OPEN_PATHS = new Set(["/get-session", "/sign-in/email", "/sign-out", "/ok", "/error"]);

function withCookies(response: NextResponse, setCookies: string[]) {
  for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
  return response;
}

/** What next-auth/react reads on a refusal: `error` in the returned URL. */
const refusal = (code: string) =>
  NextResponse.json({ url: `${siteUrl()}${LOGIN_PATH}?error=CredentialsSignin&code=${code}` });

/** A same-origin path from the client's callbackUrl, or the dashboard. */
export function landing(callbackUrl: FormDataEntryValue | null | undefined): string {
  const raw = typeof callbackUrl === "string" ? callbackUrl : "";
  const origin = new URL(siteUrl()).origin;
  try {
    const url = new URL(raw || "/dashboard", origin);
    if (url.origin !== origin) return "/dashboard";
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}

/** The one method Kivvi offers: email and password. */
export function providers() {
  return {
    credentials: {
      id: "credentials",
      name: "credentials",
      type: "credentials",
      signinUrl: `${siteUrl()}/api/auth/signin/credentials`,
      callbackUrl: `${siteUrl()}/api/auth/callback/credentials`,
    },
  };
}

/**
 * Auth.js's client protocol, answered by the shared runtime. Returns null for
 * an AccountKit path Kivvi uses, which then goes to AccountKit itself.
 */
export async function nextAuthClientCompat(request: Request): Promise<Response | null> {
  const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
  // GET reads the session; POST is useSession().update(), which needs nothing
  // carried: the session is re-read from the database on every request.
  if (path === "/session" && (request.method === "GET" || request.method === "POST")) {
    return NextResponse.json(await sharedSessionFor(request.headers), {
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (request.method === "GET" && path === "/csrf") {
    // AccountKit checks the request origin itself; the client only needs a value.
    return NextResponse.json({ csrfToken: "accountkit" });
  }
  if (request.method === "GET" && path === "/providers") {
    return NextResponse.json(providers());
  }
  if (request.method === "POST" && path === "/signout") {
    const answer = await callShared(request, "/sign-out", {});
    return withCookies(NextResponse.json({ url: `${siteUrl()}${LOGIN_PATH}` }), answer.cookies);
  }
  if (request.method === "POST" && path === "/callback/credentials") {
    const form = await request.formData().catch(() => null);
    const email = String(form?.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form?.get("password") ?? "");
    if (!email || !password) return refusal("credentials");
    const answer = await callShared(request, "/sign-in/email", { email, password });
    if (answer.status === 200) {
      const next = `${siteUrl()}${landing(form?.get("callbackUrl"))}`;
      return withCookies(NextResponse.json({ url: next }), answer.cookies);
    }
    if (answer.status === 429) return refusal("rate_limited");
    if (answer.status >= 500) return refusal("unavailable");
    return refusal("credentials");
  }
  if (OPEN_PATHS.has(path)) return null;
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
