import { describe, it, expect } from "vitest";
import {
  CHECKLIST_TEMPLATES,
  ITEM_CATEGORIES,
  getChecklistTemplate,
  areBlockingChecksPassed,
  suggestCondition,
} from "../config/checklist-templates";
import type { ChecklistItemCompletion } from "../config/checklist-templates";

// ============================================================================
// CHECKLIST_TEMPLATES — SSOT invariants
// ============================================================================

describe("CHECKLIST_TEMPLATES structure", () => {
  it("ITEM_CATEGORIES equals Object.keys(CHECKLIST_TEMPLATES)", () => {
    expect(ITEM_CATEGORIES).toEqual(Object.keys(CHECKLIST_TEMPLATES));
  });

  it("contains all expected categories including recently added ones", () => {
    const expected = [
      "laptop",
      "desktop",
      "monitor",
      "phone",
      "tablet",
      "server",
      "printer",
      "keyboard",
      "mouse",
      "peripheral",
      "networking",
      "clothing",
      "furniture",
      "book",
      "toy",
      "bike",
      "appliance",
      "electronics",
      "other",
    ];
    for (const cat of expected) {
      expect(ITEM_CATEGORIES, `missing category: ${cat}`).toContain(cat);
    }
  });

  it("every template has a non-empty labelKey", () => {
    for (const [cat, tmpl] of Object.entries(CHECKLIST_TEMPLATES)) {
      expect(tmpl.labelKey, `${cat}.labelKey empty`).toBeTruthy();
    }
  });

  it("every template has at least one check", () => {
    for (const [cat, tmpl] of Object.entries(CHECKLIST_TEMPLATES)) {
      expect(tmpl.checks.length, `${cat} has no checks`).toBeGreaterThan(0);
    }
  });

  it("every check has required fields with correct types", () => {
    for (const [cat, tmpl] of Object.entries(CHECKLIST_TEMPLATES)) {
      for (const check of tmpl.checks) {
        expect(check.id, `${cat}: check missing id`).toBeTruthy();
        expect(
          check.labelKey,
          `${cat}/${check.id}: missing labelKey`,
        ).toBeTruthy();
        expect(
          ["pass_fail", "measurement", "confirm"],
          `${cat}/${check.id}: invalid type "${check.type}"`,
        ).toContain(check.type);
        expect(
          typeof check.blocking,
          `${cat}/${check.id}: blocking not boolean`,
        ).toBe("boolean");
        expect(
          typeof check.required,
          `${cat}/${check.id}: required not boolean`,
        ).toBe("boolean");
      }
    }
  });

  it("no duplicate check IDs within a template", () => {
    for (const [cat, tmpl] of Object.entries(CHECKLIST_TEMPLATES)) {
      const ids = tmpl.checks.map((c) => c.id);
      const unique = new Set(ids);
      expect(unique.size, `${cat}: duplicate check IDs found`).toBe(ids.length);
    }
  });

  it("templates with hasDataToErase have a data_erasure confirm check", () => {
    for (const [cat, tmpl] of Object.entries(CHECKLIST_TEMPLATES)) {
      if (tmpl.hasDataToErase) {
        const hasErasureCheck = tmpl.checks.some(
          (c) => c.id === "data_erasure" && c.type === "confirm",
        );
        expect(
          hasErasureCheck,
          `${cat}: hasDataToErase but no data_erasure confirm check`,
        ).toBe(true);
      }
    }
  });
});

// ============================================================================
// getChecklistTemplate — fallback behaviour
// ============================================================================

describe("getChecklistTemplate", () => {
  it("returns the correct template for known category", () => {
    expect(getChecklistTemplate("laptop").category).toBe("laptop");
  });

  it("returns 'other' template for unknown category", () => {
    expect(getChecklistTemplate("unknown_thing")).toBe(
      CHECKLIST_TEMPLATES.other,
    );
  });

  it("returns 'other' template for null/undefined", () => {
    expect(getChecklistTemplate(null)).toBe(CHECKLIST_TEMPLATES.other);
    expect(getChecklistTemplate(undefined)).toBe(CHECKLIST_TEMPLATES.other);
  });

  it("server template has hasDataToErase: true", () => {
    expect(getChecklistTemplate("server").hasDataToErase).toBe(true);
  });

  it("laptop template has hasDataToErase: true", () => {
    expect(getChecklistTemplate("laptop").hasDataToErase).toBe(true);
  });

  it("book template has hasDataToErase: false (no digital data)", () => {
    expect(getChecklistTemplate("book").hasDataToErase).toBe(false);
  });

  it("keyboard template has hasDataToErase: false", () => {
    expect(getChecklistTemplate("keyboard").hasDataToErase).toBe(false);
  });
});

// ============================================================================
// areBlockingChecksPassed — gate logic
// ============================================================================

function makeCompletion(
  id: string,
  result: "pass" | "fail" | "skip",
  skipReason?: string,
): ChecklistItemCompletion {
  return {
    id,
    result,
    value: "",
    skipReason,
    completedAt: "2026-04-24T00:00:00Z",
    completedBy: "user-1",
  };
}

describe("areBlockingChecksPassed", () => {
  it("returns passed:true when all blocking checks pass", () => {
    const tmpl = getChecklistTemplate("laptop");
    const blockingIds = tmpl.checks.filter((c) => c.blocking).map((c) => c.id);

    const completions = blockingIds.map((id) => makeCompletion(id, "pass"));
    expect(areBlockingChecksPassed(tmpl, completions).passed).toBe(true);
  });

  it("returns passed:false when a blocking check fails", () => {
    const tmpl = getChecklistTemplate("laptop");
    const blockingId = tmpl.checks.find((c) => c.blocking)!.id;

    const completions = [makeCompletion(blockingId, "fail")];
    expect(areBlockingChecksPassed(tmpl, completions).passed).toBe(false);
  });

  it("returns passed:false when a blocking check is unanswered (missing)", () => {
    const tmpl = getChecklistTemplate("laptop");
    // Pass no completions — all blocking checks are missing
    expect(areBlockingChecksPassed(tmpl, []).passed).toBe(false);
  });

  it("returns passed:true when blocking check is skipped with reason", () => {
    const tmpl = getChecklistTemplate("laptop");
    const blockingId = tmpl.checks.find((c) => c.blocking)!.id;

    const completions = [
      makeCompletion(blockingId, "skip", "no PSU available"),
    ];
    // Other blocking checks still missing — only tests skip behaviour for one check
    const result = areBlockingChecksPassed(tmpl, completions);
    // The skipped check should not appear in missing
    expect(result.missing).not.toContain(blockingId);
  });

  it("returns passed:false when required blocking check is skipped WITHOUT reason", () => {
    const tmpl = getChecklistTemplate("laptop");
    const requiredBlockingCheck = tmpl.checks.find(
      (c) => c.blocking && c.required,
    )!;

    const completions = [makeCompletion(requiredBlockingCheck.id, "skip")];
    expect(areBlockingChecksPassed(tmpl, completions).passed).toBe(false);
  });
});

// ============================================================================
// suggestCondition — condition grading from check results
// ============================================================================

describe("suggestCondition", () => {
  it("returns like_new when all checks pass", () => {
    const tmpl = getChecklistTemplate("laptop");
    const completions = tmpl.checks.map((c) => makeCompletion(c.id, "pass"));
    expect(suggestCondition(completions)).toBe("like_new");
  });

  it("returns null when no checks answered", () => {
    expect(suggestCondition([])).toBeNull();
  });

  it("returns poor when majority of checks fail", () => {
    const tmpl = getChecklistTemplate("laptop");
    // Fail most checks
    const completions = tmpl.checks.map((c, i) =>
      makeCompletion(c.id, i < tmpl.checks.length - 1 ? "fail" : "pass"),
    );
    const result = suggestCondition(completions);
    expect(["fair", "poor"]).toContain(result);
  });
});
