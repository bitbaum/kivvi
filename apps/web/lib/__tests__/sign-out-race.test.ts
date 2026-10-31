import { describe, expect, it, vi } from "vitest";
import { isPrefetchRequest, withoutSessionRefresh } from "../security/session-refresh";
import { signOutAndLeave } from "../sign-out";

/**
 * Sign-out must stick. Twice on main (#197, #200) a prefetch that was in flight
 * at sign-out answered after it, re-set the session cookie, and /login sent
 * the person back to /dashboard, signed in.
 */

const REFRESH = "authjs.session-token=eyJhbGciOiJkaXIi; Path=/; Expires=Sat, 07 Nov 2026; HttpOnly";
const SECURE_CHUNK = "__Secure-authjs.session-token.1=eyJ; Path=/; Secure; HttpOnly";
const OTHER = "theme=dark; Path=/";

function responseWith(...cookies: string[]) {
  const headers = new Headers({ "x-middleware-next": "1" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 200, headers });
}

describe("a prefetch never writes the session", () => {
  it("knows a router prefetch and a browser prefetch from a navigation", () => {
    expect(isPrefetchRequest(new Headers({ "next-router-prefetch": "1", rsc: "1" }))).toBe(true);
    expect(isPrefetchRequest(new Headers({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetchRequest(new Headers({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
    expect(isPrefetchRequest(new Headers({ rsc: "1" }))).toBe(false);
    expect(isPrefetchRequest(new Headers())).toBe(false);
  });

  it("drops the session cookie refresh and keeps every other cookie and header", () => {
    const out = withoutSessionRefresh(responseWith(REFRESH, SECURE_CHUNK, OTHER));
    expect(out.headers.getSetCookie()).toEqual([OTHER]);
    expect(out.headers.get("x-middleware-next")).toBe("1");
    expect(out.status).toBe(200);
  });

  it("leaves a response without a session cookie as it is", () => {
    const response = responseWith(OTHER);
    expect(withoutSessionRefresh(response)).toBe(response);
  });
});

describe("signing out", () => {
  const deps = (sessions: Array<object | null>) => ({
    signOut: vi.fn(async () => undefined),
    getSession: vi.fn(async () => sessions.shift() ?? null),
    leave: vi.fn(),
  });

  it("signs out once and leaves for /login when the session is gone", async () => {
    const d = deps([null]);
    await signOutAndLeave("/login", d as never);
    expect(d.signOut).toHaveBeenCalledTimes(1);
    expect(d.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(d.leave).toHaveBeenCalledWith("/login");
  });

  it("signs out again when a late response wrote the session back", async () => {
    const d = deps([{ user: { email: "a@example.test" } }, null]);
    await signOutAndLeave("/login", d as never);
    expect(d.signOut).toHaveBeenCalledTimes(2);
    expect(d.leave).toHaveBeenCalledTimes(1);
  });

  it("gives up after a few tries and still leaves the page", async () => {
    const session = { user: { email: "a@example.test" } };
    const d = deps([session, session, session, session]);
    await signOutAndLeave("/login", d as never, 3);
    expect(d.signOut).toHaveBeenCalledTimes(3);
    expect(d.leave).toHaveBeenCalledWith("/login");
  });

  it("leaves the page even when the sign-out request fails", async () => {
    const d = deps([]);
    d.signOut.mockRejectedValueOnce(new Error("offline"));
    await expect(signOutAndLeave("/login", d as never)).rejects.toThrow("offline");
    expect(d.leave).toHaveBeenCalledWith("/login");
  });
});
