/**
 * Checklist templates — SSOT for all item category checklists.
 *
 * Each category defines the checks a technician must perform before an item
 * can be approved for sale. Checks are either:
 *   - blocking:  must PASS (or be skipped with a reason) to reach ready_for_sale
 *   - required:  must be attempted; skip requires a reason
 *   - optional:  guidance only, no enforcement
 *
 * Adding a new category: add an entry to CHECKLIST_TEMPLATES. No code changes elsewhere.
 * The domain reads this config; the UI renders from it.
 *
 * Client-safe: no DB or server dependencies.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ChecklistCheckType =
  | "pass_fail" // Simple yes/no toggle
  | "measurement" // Numeric value with unit (e.g. battery %)
  | "confirm"; // Checkbox — confirms an action was taken (e.g. data erased)

export type ChecklistItemResult = "pass" | "fail" | "skip" | null;

export type ChecklistCheckDef = {
  id: string;
  /** i18n key within "checklist" namespace */
  labelKey: string;
  type: ChecklistCheckType;
  /** Unit shown next to measurement input (e.g. "%", "GB") */
  unit?: string;
  /**
   * Blocking: must PASS to proceed to ready_for_sale.
   * A "fail" on a blocking check means the item needs repair/scrap routing.
   */
  blocking: boolean;
  /**
   * Required: must be attempted (pass, fail, or skip+reason).
   * Optional checks can be left untouched.
   */
  required: boolean;
  /**
   * If this check fails, suggest routing the item to this status.
   * The technician is not forced — it's a UX suggestion.
   */
  failSuggestsStatus?: "repair" | "parts_only" | "scrap";
};

export type ChecklistTemplate = {
  category: string;
  /** i18n key within "checklist" namespace */
  labelKey: string;
  /** Whether this category typically contains storage with user data to erase */
  hasDataToErase: boolean;
  checks: ChecklistCheckDef[];
};

// ============================================================================
// COMPLETION TYPES (stored as JSONB on inventory_items.checklist_data)
// ============================================================================

export type ChecklistItemCompletion = {
  id: string;
  result: "pass" | "fail" | "skip";
  value?: string; // For measurement type
  skipReason?: string; // Required when result is "skip" on a required check
  completedAt: string; // ISO timestamp
  completedBy: string; // userId
};

export type ChecklistData = {
  category: string;
  completions: ChecklistItemCompletion[];
  signedOffAt?: string; // ISO timestamp — set when approved for sale
  signedOffBy?: string; // userId
};

// ============================================================================
// TEMPLATES
// ============================================================================

export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  laptop: {
    category: "laptop",
    labelKey: "categoryLaptop",
    hasDataToErase: true,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "display",
        labelKey: "checkDisplay",
        type: "pass_fail",
        blocking: false,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "keyboard",
        labelKey: "checkKeyboard",
        type: "pass_fail",
        blocking: false,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "trackpad",
        labelKey: "checkTrackpad",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "battery_pct",
        labelKey: "checkBatteryPct",
        type: "measurement",
        blocking: false,
        required: false,
        unit: "%",
      },
      {
        id: "storage_smart",
        labelKey: "checkStorageSmart",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "ram_ok",
        labelKey: "checkRamOk",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "wifi",
        labelKey: "checkWifi",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "data_erasure",
        labelKey: "checkDataErasure",
        type: "confirm",
        blocking: true,
        required: true,
      },
      {
        id: "os_installed",
        labelKey: "checkOsInstalled",
        type: "confirm",
        blocking: true,
        required: true,
      },
      {
        id: "os_boots",
        labelKey: "checkOsBoots",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "charger",
        labelKey: "checkCharger",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  desktop: {
    category: "desktop",
    labelKey: "categoryDesktop",
    hasDataToErase: true,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "post_ok",
        labelKey: "checkPostOk",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "storage_smart",
        labelKey: "checkStorageSmart",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "ram_ok",
        labelKey: "checkRamOk",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "data_erasure",
        labelKey: "checkDataErasure",
        type: "confirm",
        blocking: true,
        required: true,
      },
      {
        id: "os_installed",
        labelKey: "checkOsInstalled",
        type: "confirm",
        blocking: true,
        required: true,
      },
      {
        id: "os_boots",
        labelKey: "checkOsBoots",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "cable_power",
        labelKey: "checkCablePower",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  monitor: {
    category: "monitor",
    labelKey: "categoryMonitor",
    hasDataToErase: false,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "display_ok",
        labelKey: "checkDisplayOk",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "no_dead_pixels",
        labelKey: "checkNoDeadPixels",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "cable_included",
        labelKey: "checkCableIncluded",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  phone: {
    category: "phone",
    labelKey: "categoryPhone",
    hasDataToErase: true,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "screen_intact",
        labelKey: "checkScreenIntact",
        type: "pass_fail",
        blocking: false,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "touch_works",
        labelKey: "checkTouchWorks",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "battery_pct",
        labelKey: "checkBatteryPct",
        type: "measurement",
        blocking: false,
        required: false,
        unit: "%",
      },
      {
        id: "data_erasure",
        labelKey: "checkDataErasure",
        type: "confirm",
        blocking: true,
        required: true,
      },
      {
        id: "sim_removed",
        labelKey: "checkSimRemoved",
        type: "confirm",
        blocking: false,
        required: true,
      },
    ],
  },

  tablet: {
    category: "tablet",
    labelKey: "categoryTablet",
    hasDataToErase: true,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "screen_intact",
        labelKey: "checkScreenIntact",
        type: "pass_fail",
        blocking: false,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "touch_works",
        labelKey: "checkTouchWorks",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "battery_pct",
        labelKey: "checkBatteryPct",
        type: "measurement",
        blocking: false,
        required: false,
        unit: "%",
      },
      {
        id: "data_erasure",
        labelKey: "checkDataErasure",
        type: "confirm",
        blocking: true,
        required: true,
      },
    ],
  },

  printer: {
    category: "printer",
    labelKey: "categoryPrinter",
    hasDataToErase: false,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "prints_ok",
        labelKey: "checkPrintsOk",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "cable_included",
        labelKey: "checkCableIncluded",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  bike: {
    category: "bike",
    labelKey: "categoryBike",
    hasDataToErase: false,
    checks: [
      {
        id: "frame_ok",
        labelKey: "checkFrameOk",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "brakes_front",
        labelKey: "checkBrakesFront",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "brakes_rear",
        labelKey: "checkBrakesRear",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "gears",
        labelKey: "checkGears",
        type: "pass_fail",
        blocking: false,
        required: false,
        failSuggestsStatus: "repair",
      },
      {
        id: "tires",
        labelKey: "checkTires",
        type: "pass_fail",
        blocking: false,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "lights",
        labelKey: "checkLights",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "test_ride",
        labelKey: "checkTestRide",
        type: "confirm",
        blocking: true,
        required: true,
      },
    ],
  },

  clothing: {
    category: "clothing",
    labelKey: "categoryClothing",
    hasDataToErase: false,
    checks: [
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "no_damage",
        labelKey: "checkNoDamage",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "zips_ok",
        labelKey: "checkZipsOk",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "size_labeled",
        labelKey: "checkSizeLabeled",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  furniture: {
    category: "furniture",
    labelKey: "categoryFurniture",
    hasDataToErase: false,
    checks: [
      {
        id: "structural_ok",
        labelKey: "checkStructuralOk",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "no_infestation",
        labelKey: "checkNoInfestation",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "scrap",
      },
      {
        id: "complete",
        labelKey: "checkComplete",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  book: {
    category: "book",
    labelKey: "categoryBook",
    hasDataToErase: false,
    checks: [
      {
        id: "readable",
        labelKey: "checkReadable",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "complete",
        labelKey: "checkComplete",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  appliance: {
    category: "appliance",
    labelKey: "categoryAppliance",
    hasDataToErase: false,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "functions_ok",
        labelKey: "checkFunctionsOk",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "cable_ok",
        labelKey: "checkCableOk",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  server: {
    category: "server",
    labelKey: "categoryServer",
    hasDataToErase: true,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "post_ok",
        labelKey: "checkPostOk",
        type: "pass_fail",
        blocking: false,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "storage_smart",
        labelKey: "checkStorageSmart",
        type: "pass_fail",
        blocking: false,
        required: false,
        failSuggestsStatus: "repair",
      },
      {
        id: "ram_ok",
        labelKey: "checkRamOk",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "data_erasure",
        labelKey: "checkDataErasure",
        type: "confirm",
        blocking: true,
        required: true,
      },
    ],
  },

  keyboard: {
    category: "keyboard",
    labelKey: "categoryKeyboard",
    hasDataToErase: false,
    checks: [
      {
        id: "functional",
        labelKey: "checkFunctional",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
    ],
  },

  mouse: {
    category: "mouse",
    labelKey: "categoryMouse",
    hasDataToErase: false,
    checks: [
      {
        id: "functional",
        labelKey: "checkFunctional",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
    ],
  },

  peripheral: {
    category: "peripheral",
    labelKey: "categoryPeripheral",
    hasDataToErase: false,
    checks: [
      {
        id: "functional",
        labelKey: "checkFunctional",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "cable_ok",
        labelKey: "checkCableOk",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  networking: {
    category: "networking",
    labelKey: "categoryNetworking",
    hasDataToErase: false,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "functions_ok",
        labelKey: "checkFunctionsOk",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  toy: {
    category: "toy",
    labelKey: "categoryToy",
    hasDataToErase: false,
    checks: [
      {
        id: "functional",
        labelKey: "checkFunctional",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: true,
        required: true,
      },
      {
        id: "no_damage",
        labelKey: "checkNoDamage",
        type: "pass_fail",
        blocking: false,
        required: true,
      },
      {
        id: "complete",
        labelKey: "checkComplete",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  electronics: {
    category: "electronics",
    labelKey: "categoryElectronics",
    hasDataToErase: false,
    checks: [
      {
        id: "power_on",
        labelKey: "checkPowerOn",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "functions_ok",
        labelKey: "checkFunctionsOk",
        type: "pass_fail",
        blocking: true,
        required: true,
        failSuggestsStatus: "repair",
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },

  other: {
    category: "other",
    labelKey: "categoryOther",
    hasDataToErase: false,
    checks: [
      {
        id: "functional",
        labelKey: "checkFunctional",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
      {
        id: "clean",
        labelKey: "checkClean",
        type: "pass_fail",
        blocking: false,
        required: false,
      },
    ],
  },
};

// ============================================================================
// HELPERS (pure functions — no side effects)
// ============================================================================

export const ITEM_CATEGORIES = Object.keys(CHECKLIST_TEMPLATES) as string[];

/** Categories whose items can store personal data and require documented erasure. */
export const DATA_BEARING_CATEGORIES = [
  "laptop",
  "desktop",
  "phone",
  "tablet",
] as const;

export type DataBearingCategory = (typeof DATA_BEARING_CATEGORIES)[number];

/**
 * Get checklist template for a category.
 * Falls back to "other" for unknown categories — never throws.
 */
export function getChecklistTemplate(
  category: string | null | undefined,
): ChecklistTemplate {
  return CHECKLIST_TEMPLATES[category ?? "other"] ?? CHECKLIST_TEMPLATES.other;
}

/**
 * Check whether all blocking checks have passed.
 * A "fail" result on a blocking check means the item should not be sold.
 * A "skip" with a reason is allowed (manager override).
 *
 * Returns { passed: true } or { passed: false, missing: string[] }
 */
export function areBlockingChecksPassed(
  template: ChecklistTemplate,
  completions: ChecklistItemCompletion[],
): { passed: boolean; missing: string[] } {
  const completionMap = new Map(completions.map((c) => [c.id, c]));
  const missing: string[] = [];

  for (const check of template.checks) {
    if (!check.blocking) continue;
    const completion = completionMap.get(check.id);
    if (!completion) {
      missing.push(check.id);
      continue;
    }
    // "fail" on blocking = blocked (must repair or route away)
    if (completion.result === "fail") {
      missing.push(check.id);
    }
    // "skip" without a reason on a required blocking check = blocked
    if (
      completion.result === "skip" &&
      check.required &&
      !completion.skipReason
    ) {
      missing.push(check.id);
    }
  }

  return { passed: missing.length === 0, missing };
}

/**
 * Check if all required checks have been attempted (pass/fail/skip).
 * Used by the UI to show checklist completion state.
 */
export function areRequiredChecksAttempted(
  template: ChecklistTemplate,
  completions: ChecklistItemCompletion[],
): { complete: boolean; remaining: string[] } {
  const completionMap = new Map(completions.map((c) => [c.id, c]));
  const remaining: string[] = [];

  for (const check of template.checks) {
    if (!check.required) continue;
    const completion = completionMap.get(check.id);
    if (!completion) remaining.push(check.id);
  }

  return { complete: remaining.length === 0, remaining };
}

/**
 * Suggest a condition grade based on checklist results.
 * This is a heuristic — the technician always confirms.
 */
export function suggestCondition(
  completions: ChecklistItemCompletion[],
): "like_new" | "good" | "fair" | "poor" | null {
  if (completions.length === 0) return null;

  const fails = completions.filter((c) => c.result === "fail").length;
  const total = completions.length;
  const failRate = fails / total;

  if (failRate === 0) return "like_new";
  if (failRate <= 0.1) return "good";
  if (failRate <= 0.25) return "fair";
  return "poor";
}

/** Data erasure method labels (for UI + certificates) */
export const DATA_ERASURE_METHODS: Record<string, string> = {
  secure_erase: "ATA Secure Erase",
  dban: "DBAN (Darik's Boot and Nuke)",
  manual: "Manuell / Degausser",
  certified: "Zertifizierter Dienstleister",
  factory_reset: "Factory Reset (Mobilgeräte)",
};
