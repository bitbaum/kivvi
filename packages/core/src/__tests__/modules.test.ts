import { describe, it, expect } from "vitest";
import {
  TOGGLEABLE_MODULES,
  TOGGLEABLE_MODULE_KEYS,
  isToggleableModule,
  isModuleEnabled,
  getEnabledToggleableModules,
  MODULE_ROUTE_PREFIXES,
  moduleForPath,
  type ModuleKey,
} from "../config/modules";

// ============================================================================
// Registry SSOT invariants
// ============================================================================

describe("TOGGLEABLE_MODULES registry", () => {
  it("contains the five documented toggleable modules", () => {
    expect(TOGGLEABLE_MODULE_KEYS).toEqual([
      "intake",
      "repairs",
      "pos",
      "purchasing",
      "projects",
    ]);
  });

  it("every entry has a key, labelKey and a default of true", () => {
    for (const mod of TOGGLEABLE_MODULES) {
      expect(mod.key, "key must be non-empty").toBeTruthy();
      expect(
        mod.labelKey,
        `${mod.key}: labelKey must be non-empty`,
      ).toBeTruthy();
      expect(mod.default, `${mod.key}: default must be true`).toBe(true);
    }
  });

  it("keys are unique", () => {
    expect(new Set(TOGGLEABLE_MODULE_KEYS).size).toBe(
      TOGGLEABLE_MODULE_KEYS.length,
    );
  });
});

// ============================================================================
// isToggleableModule
// ============================================================================

describe("isToggleableModule", () => {
  it("returns true for every registered module key", () => {
    for (const key of TOGGLEABLE_MODULE_KEYS) {
      expect(isToggleableModule(key)).toBe(true);
    }
  });

  it("returns false for core / unknown keys", () => {
    expect(isToggleableModule("sales")).toBe(false);
    expect(isToggleableModule("reports")).toBe(false);
    expect(isToggleableModule("does-not-exist")).toBe(false);
    expect(isToggleableModule("")).toBe(false);
  });
});

// ============================================================================
// isModuleEnabled — the backward-compatibility heart
// ============================================================================

describe("isModuleEnabled", () => {
  it("undefined enabledModules → ALL toggleable modules enabled (legacy default)", () => {
    for (const key of TOGGLEABLE_MODULE_KEYS) {
      expect(isModuleEnabled(undefined, key)).toBe(true);
    }
  });

  it("empty array → every toggleable module is disabled", () => {
    for (const key of TOGGLEABLE_MODULE_KEYS) {
      expect(isModuleEnabled([], key)).toBe(false);
    }
  });

  it("empty array → core (non-toggleable) modules stay enabled", () => {
    expect(isModuleEnabled([], "sales")).toBe(true);
    expect(isModuleEnabled([], "reports")).toBe(true);
    expect(isModuleEnabled([], "settings")).toBe(true);
  });

  it("partial list → only listed toggleable modules are enabled", () => {
    const enabled = ["intake", "repairs"];
    expect(isModuleEnabled(enabled, "intake")).toBe(true);
    expect(isModuleEnabled(enabled, "repairs")).toBe(true);
    expect(isModuleEnabled(enabled, "pos")).toBe(false);
    expect(isModuleEnabled(enabled, "purchasing")).toBe(false);
    expect(isModuleEnabled(enabled, "projects")).toBe(false);
  });

  it("non-toggleable key is ALWAYS enabled regardless of the list", () => {
    expect(isModuleEnabled(undefined, "sales")).toBe(true);
    expect(isModuleEnabled([], "sales")).toBe(true);
    expect(isModuleEnabled(["intake"], "sales")).toBe(true);
  });

  it("unknown key is treated as core (non-toggleable) → always enabled", () => {
    expect(isModuleEnabled([], "unknown-module")).toBe(true);
    expect(isModuleEnabled(["intake"], "unknown-module")).toBe(true);
  });

  it("a stale key that is not toggleable is ignored, not crashed on", () => {
    // A company could have a leftover key from a removed module.
    expect(isModuleEnabled(["intake", "legacy-thing"], "pos")).toBe(false);
    expect(isModuleEnabled(["intake", "legacy-thing"], "intake")).toBe(true);
  });
});

// ============================================================================
// getEnabledToggleableModules
// ============================================================================

describe("getEnabledToggleableModules", () => {
  it("undefined → returns all toggleable modules", () => {
    expect(getEnabledToggleableModules(undefined)).toEqual(
      TOGGLEABLE_MODULE_KEYS,
    );
  });

  it("empty array → returns none", () => {
    expect(getEnabledToggleableModules([])).toEqual([]);
  });

  it("partial list → returns the enabled subset in registry order", () => {
    // Note reversed input order — output preserves registry order.
    const result = getEnabledToggleableModules(["projects", "intake"]);
    expect(result).toEqual<ModuleKey[]>(["intake", "projects"]);
  });

  it("ignores unknown keys in the input list", () => {
    expect(getEnabledToggleableModules(["intake", "nope"])).toEqual<
      ModuleKey[]
    >(["intake"]);
  });
});

// ============================================================================
// Route → module mapping (middleware gating)
// ============================================================================

describe("MODULE_ROUTE_PREFIXES", () => {
  it("has an entry for every toggleable module", () => {
    for (const key of TOGGLEABLE_MODULE_KEYS) {
      expect(MODULE_ROUTE_PREFIXES[key].length).toBeGreaterThan(0);
    }
  });
});

describe("moduleForPath", () => {
  it("matches an exact module root path", () => {
    expect(moduleForPath("/intake")).toBe("intake");
    expect(moduleForPath("/pos")).toBe("pos");
  });

  it("matches nested paths under a module", () => {
    expect(moduleForPath("/intake/new")).toBe("intake");
    expect(moduleForPath("/repairs/123/edit")).toBe("repairs");
    expect(moduleForPath("/purchasing/purchase-invoices")).toBe("purchasing");
    expect(moduleForPath("/projects/abc")).toBe("projects");
  });

  it("returns null for core / unowned paths", () => {
    expect(moduleForPath("/dashboard")).toBeNull();
    expect(moduleForPath("/sales/invoices")).toBeNull();
    expect(moduleForPath("/settings/modules")).toBeNull();
    expect(moduleForPath("/")).toBeNull();
  });

  it("does not match a path that merely shares a prefix string", () => {
    // "/intaker" must NOT be treated as the "/intake" module
    expect(moduleForPath("/intaker")).toBeNull();
    expect(moduleForPath("/positions")).toBeNull();
  });

  it("agrees with isModuleEnabled for gating decisions", () => {
    // A disabled module's path is gated; an enabled one is not.
    const enabled = ["repairs"]; // intake disabled, repairs enabled
    const intakeMod = moduleForPath("/intake/new");
    const repairsMod = moduleForPath("/repairs");
    expect(intakeMod && isModuleEnabled(enabled, intakeMod)).toBe(false);
    expect(repairsMod && isModuleEnabled(enabled, repairsMod)).toBe(true);
  });
});
