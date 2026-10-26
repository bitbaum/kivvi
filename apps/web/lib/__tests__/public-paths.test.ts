import { describe, expect, it } from "vitest";
import { isPublicPath } from "../security/public-paths";

describe("public middleware paths", () => {
  it("serves the public Fleet deployment receipt without opening the app", () => {
    expect(isPublicPath("/.well-known/fleet-release.json", "production", undefined)).toBe(true);
    expect(isPublicPath("/dashboard", "production", undefined)).toBe(false);
  });

  it("keeps the ChatKit smoke page limited to guarded non-production runs", () => {
    expect(isPublicPath("/smoke/chatkit", "test", "true")).toBe(true);
    expect(isPublicPath("/smoke/chatkit", "production", "true")).toBe(false);
    expect(isPublicPath("/smoke/chatkit", "test", undefined)).toBe(false);
  });
});
