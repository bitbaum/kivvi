import { describe, expect, it } from "vitest";
import { isPublicPath } from "../security/public-paths";

describe("public middleware paths", () => {
  it("serves the public Fleet deployment receipt without opening the app", () => {
    expect(isPublicPath("/.well-known/fleet-release.json", "production", undefined)).toBe(true);
    expect(isPublicPath("/dashboard", "production", undefined)).toBe(false);
  });

  it("lets a signed-out visitor read the legal pages the sign-in forms link to", () => {
    for (const path of ["/terms", "/privacy", "/datenschutz", "/impressum"]) {
      expect(isPublicPath(path, "production", undefined)).toBe(true);
    }
  });

  it("keeps the ChatKit smoke page limited to guarded non-production runs", () => {
    expect(isPublicPath("/smoke/chatkit", "test", "true")).toBe(true);
    expect(isPublicPath("/smoke/chatkit", "production", "true")).toBe(false);
    expect(isPublicPath("/smoke/chatkit", "test", undefined)).toBe(false);
  });
});
