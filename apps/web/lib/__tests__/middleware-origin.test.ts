import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicPath } from "../security/public-paths";

/**
 * Behind Caddy the app sees itself as localhost:4005. On the shared runtime
 * the middleware built its redirects from that, so a
 * signed-out prefetch of /contact answered 307 to https://localhost:4005/login,
 * the CSP blocked it, and every deploy since the switch failed its page check.
 */
const session = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/lib/accountkit/compat", () => ({
  compat: { sessionFor: async () => session.value },
}));

const PUBLIC = "https://kivvi.example.test";

/** A request as the app receives it from the proxy. */
const proxied = (pathname: string) =>
  new NextRequest(`https://localhost:4005${pathname}`, {
    headers: {
      host: "kivvi.example.test",
      "x-forwarded-host": "kivvi.example.test",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "198.51.100.7",
    },
  });

describe("middleware redirects stay on the public origin", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_URL", PUBLIC);
    session.value = null;
  });

  it("sends a signed-out visitor to the public /login", async () => {
    const { default: middleware } = await import("../../middleware");
    const res = await middleware(proxied("/dashboard"));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe(`${PUBLIC}/login?callbackUrl=%2Fdashboard`);
  });

  it("sends a signed-in person without a company to the public /join", async () => {
    session.value = { user: { id: "u1", companyId: null }, expires: "" };
    const { default: middleware } = await import("../../middleware");
    const res = await middleware(proxied("/dashboard"));
    expect(res?.headers.get("location")).toBe(`${PUBLIC}/join`);
  });

  it("lets a signed-out visitor open every landing page", async () => {
    const landing = path.resolve(__dirname, "../../app/(landing)");
    const pages = readdirSync(landing).filter((d) => statSync(path.join(landing, d)).isDirectory());
    expect(pages).toContain("contact");
    for (const page of pages) {
      expect(isPublicPath(`/${page}`, "production", undefined), `/${page}`).toBe(true);
    }
    expect(isPublicPath("/contacts", "production", undefined)).toBe(false);
  });
});
