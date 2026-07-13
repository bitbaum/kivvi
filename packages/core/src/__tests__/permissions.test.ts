import { describe, expect, it } from "vitest";
import {
  hasCapability,
  normalizePermissionPreset,
  presetForRole,
  roleForPreset,
} from "../domain/permissions";

describe("permission presets", () => {
  it("maps legacy roles to compatible presets", () => {
    expect(presetForRole("owner")).toBe("owner");
    expect(presetForRole("admin")).toBe("admin");
    expect(presetForRole("member")).toBe("sales");
    expect(presetForRole("viewer")).toBe("viewer");
  });

  it("maps practical presets back to compatible membership roles", () => {
    expect(roleForPreset("finance")).toBe("member");
    expect(roleForPreset("repair")).toBe("member");
    expect(roleForPreset("admin")).toBe("admin");
    expect(roleForPreset("viewer")).toBe("viewer");
  });

  it("normalizes unknown stored values using the legacy role", () => {
    expect(normalizePermissionPreset("bad-value", "viewer")).toBe("viewer");
    expect(normalizePermissionPreset(null, "member")).toBe("sales");
  });

  it("grants capabilities by fixed preset", () => {
    expect(hasCapability("owner", "team.manage")).toBe(true);
    expect(hasCapability("finance", "finance.manage")).toBe(true);
    expect(hasCapability("viewer", "finance.manage")).toBe(false);
    expect(hasCapability("repair", "repair.manage")).toBe(true);
  });
});
