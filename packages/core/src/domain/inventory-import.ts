/**
 * Smart inventory-item import analysis (SSOT, pure — no DB, client-safe).
 *
 * A bulk import of secondhand items is NOT a blind insert. Many rows in an
 * external export (Shopware, a spreadsheet, a legacy shop) describe items we
 * may no longer physically have, may lack key info, or whose location is
 * unknown. Before anything touches the database, Kivvi answers three questions
 * for every row so a human can review a worklist instead of trusting a file:
 *
 *   1. Do we actually have this item?  → presence must be confirmed per row.
 *   2. Do we have the right info?      → completeness score + missing fields.
 *   3. Where exactly is it?            → resolve to a warehouse (shop / storage /
 *                                        which storage) + a shelf/bin location.
 *
 * This module classifies rows; it does not import them. The UI presents the
 * analysis; the domain/import layer performs the writes for confirmed rows.
 *
 * Client-safe: imports only enum constants (no `@kivvi/database` runtime deps).
 */

import { ITEM_CONDITION_VALUES } from "@kivvi/database/src/enums";
import type { ItemConditionValue } from "@kivvi/database/src/enums";

// ============================================================================
// TYPES
// ============================================================================

export type ImportIssueSeverity = "error" | "warning" | "info";

export type ImportIssueCode =
  | "MISSING_DESCRIPTION"
  | "LOCATION_UNRESOLVED"
  | "LOCATION_AMBIGUOUS"
  | "MISSING_SHELF_LOCATION"
  | "CONDITION_UNKNOWN"
  | "MISSING_PRICE"
  | "MISSING_SERIAL"
  | "DUPLICATE_SERIAL_IN_FILE"
  | "DUPLICATE_SERIAL_EXISTING"
  | "PRESENCE_UNCONFIRMED";

export interface ImportIssue {
  code: ImportIssueCode;
  severity: ImportIssueSeverity;
  field?: string;
  message: string;
}

/** A raw row as parsed from the source file. All values are strings/absent. */
export interface RawImportRow {
  description?: string | null;
  category?: string | null;
  condition?: string | null;
  serialNumber?: string | null;
  askingPrice?: string | null;
  estimatedValue?: string | null;
  /** Free-text warehouse hint from the source (e.g. "Shop", "Lager 2"). */
  warehouse?: string | null;
  /** Shelf/bin within the warehouse. */
  location?: string | null;
  /** External identifier (Shopware id, kivitendo article number, …). */
  externalRef?: string | null;
  notes?: string | null;
}

export interface WarehouseOption {
  id: string;
  name: string;
  isDefault?: boolean | null;
}

export interface AnalyzeContext {
  warehouses: WarehouseOption[];
  /** Serial numbers that already exist in Kivvi (lowercased). Optional. */
  existingSerialNumbers?: Set<string>;
  /**
   * When exactly one warehouse exists (or a default is chosen in the UI), rows
   * without a resolvable warehouse hint fall back to it instead of erroring.
   */
  fallbackWarehouseId?: string | null;
}

/** Per-field completeness assessment. */
export interface ImportCompleteness {
  /** 0–100. Weighs required + recommended fields. */
  score: number;
  missing: string[];
}

export type ImportDecision = "ready" | "review" | "blocked";

export interface AnalyzedImportRow {
  index: number;
  raw: RawImportRow;
  /** Normalized, ready-to-persist values (except presence/warehouse gates). */
  normalized: {
    description: string;
    category: string | null;
    condition: ItemConditionValue;
    serialNumber: string | null;
    askingPrice: string | null;
    estimatedValue: string | null;
    location: string | null;
    notes: string | null;
    externalRef: string | null;
  };
  /** Resolved warehouse, or null when the location couldn't be determined. */
  resolvedWarehouseId: string | null;
  resolvedWarehouseName: string | null;
  issues: ImportIssue[];
  completeness: ImportCompleteness;
  /**
   * Every imported item must be physically confirmed present. Defaults to false
   * — the UI flips this per row (or in bulk) before the row can be imported.
   */
  presenceConfirmed: boolean;
  /**
   * Suggested handling once presence + location are resolved:
   *   ready   — no blockers, safe to import
   *   review  — importable but has warnings worth a human glance
   *   blocked — has errors (missing description, unresolved location, dup)
   */
  decision: ImportDecision;
}

export interface ImportAnalysisSummary {
  total: number;
  ready: number;
  review: number;
  blocked: number;
  duplicates: number;
  missingLocation: number;
  incomplete: number;
}

export interface ImportAnalysisResult {
  rows: AnalyzedImportRow[];
  summary: ImportAnalysisSummary;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Fields that make a row importable at all. */
const REQUIRED_FIELDS = ["description", "warehouse"] as const;
/** Fields that make a record trustworthy but aren't strictly required. */
const RECOMMENDED_FIELDS = [
  "condition",
  "askingPrice",
  "serialNumber",
  "location",
] as const;

// Weighting: required fields dominate the completeness score.
const REQUIRED_WEIGHT = 2;
const RECOMMENDED_WEIGHT = 1;

// ============================================================================
// HELPERS
// ============================================================================

function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Parse a possibly Swiss-formatted amount ("1'234.50") into a plain decimal. */
function normalizeAmount(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/'/g, "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return cleaned;
}

/** Map a free-text condition to a known grade, defaulting to "untested". */
function normalizeCondition(value: string | null): {
  condition: ItemConditionValue;
  recognized: boolean;
} {
  if (!value) return { condition: "untested", recognized: false };
  const key = value.toLowerCase().replace(/[\s-]+/g, "_");
  const match = (ITEM_CONDITION_VALUES as readonly string[]).find(
    (c) => c === key,
  );
  if (match)
    return { condition: match as ItemConditionValue, recognized: true };
  // Common human synonyms → grades.
  const synonyms: Record<string, ItemConditionValue> = {
    new: "like_new",
    neuwertig: "like_new",
    sehr_gut: "good",
    gut: "good",
    ok: "fair",
    mittel: "fair",
    defekt: "poor",
    schrott: "scrap",
    ersatzteile: "parts_only",
  };
  if (synonyms[key]) return { condition: synonyms[key], recognized: true };
  return { condition: "untested", recognized: false };
}

/**
 * Resolve a warehouse hint to a known warehouse.
 *   - exact (case-insensitive) name match wins
 *   - otherwise a unique substring match
 *   - ambiguous substring → LOCATION_AMBIGUOUS
 *   - no hint but a fallback exists → fallback
 */
function resolveWarehouse(
  hint: string | null,
  warehouses: WarehouseOption[],
  fallbackWarehouseId: string | null | undefined,
): {
  id: string | null;
  name: string | null;
  ambiguous: boolean;
  usedFallback: boolean;
} {
  if (!hint) {
    if (fallbackWarehouseId) {
      const wh = warehouses.find((w) => w.id === fallbackWarehouseId);
      return {
        id: wh?.id ?? null,
        name: wh?.name ?? null,
        ambiguous: false,
        usedFallback: true,
      };
    }
    return { id: null, name: null, ambiguous: false, usedFallback: false };
  }

  const needle = hint.toLowerCase();
  const exact = warehouses.filter((w) => w.name.toLowerCase() === needle);
  if (exact.length === 1) {
    return {
      id: exact[0].id,
      name: exact[0].name,
      ambiguous: false,
      usedFallback: false,
    };
  }

  const partial = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(needle) ||
      needle.includes(w.name.toLowerCase()),
  );
  if (partial.length === 1) {
    return {
      id: partial[0].id,
      name: partial[0].name,
      ambiguous: false,
      usedFallback: false,
    };
  }
  if (partial.length > 1) {
    return { id: null, name: null, ambiguous: true, usedFallback: false };
  }
  return { id: null, name: null, ambiguous: false, usedFallback: false };
}

function computeCompleteness(row: {
  description: string | null;
  resolvedWarehouseId: string | null;
  condition: ItemConditionValue;
  conditionRecognized: boolean;
  askingPrice: string | null;
  serialNumber: string | null;
  location: string | null;
}): ImportCompleteness {
  const present: Record<string, boolean> = {
    description: !!row.description,
    warehouse: !!row.resolvedWarehouseId,
    condition: row.conditionRecognized && row.condition !== "untested",
    askingPrice: !!row.askingPrice,
    serialNumber: !!row.serialNumber,
    location: !!row.location,
  };

  let earned = 0;
  let total = 0;
  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    total += REQUIRED_WEIGHT;
    if (present[field]) earned += REQUIRED_WEIGHT;
    else missing.push(field);
  }
  for (const field of RECOMMENDED_FIELDS) {
    total += RECOMMENDED_WEIGHT;
    if (present[field]) earned += RECOMMENDED_WEIGHT;
    else missing.push(field);
  }

  const score = total === 0 ? 100 : Math.round((earned / total) * 100);
  return { score, missing };
}

// ============================================================================
// ANALYSIS
// ============================================================================

/**
 * Analyze parsed import rows into a reviewable worklist. Pure and deterministic
 * — the same input always yields the same classification.
 */
export function analyzeInventoryImportRows(
  rawRows: RawImportRow[],
  context: AnalyzeContext,
): ImportAnalysisResult {
  const existing = context.existingSerialNumbers ?? new Set<string>();

  // First pass: detect serials that repeat within this file.
  const serialCounts = new Map<string, number>();
  for (const row of rawRows) {
    const serial = clean(row.serialNumber)?.toLowerCase();
    if (serial) serialCounts.set(serial, (serialCounts.get(serial) ?? 0) + 1);
  }

  const rows: AnalyzedImportRow[] = rawRows.map((raw, index) => {
    const description = clean(raw.description);
    const category = clean(raw.category);
    const serialNumber = clean(raw.serialNumber);
    const location = clean(raw.location);
    const notes = clean(raw.notes);
    const externalRef = clean(raw.externalRef);
    const askingPrice = normalizeAmount(clean(raw.askingPrice));
    const estimatedValue = normalizeAmount(clean(raw.estimatedValue));
    const { condition, recognized: conditionRecognized } = normalizeCondition(
      clean(raw.condition),
    );

    const wh = resolveWarehouse(
      clean(raw.warehouse),
      context.warehouses,
      context.fallbackWarehouseId,
    );

    const issues: ImportIssue[] = [];

    // (1) Info completeness ---------------------------------------------------
    if (!description) {
      issues.push({
        code: "MISSING_DESCRIPTION",
        severity: "error",
        field: "description",
        message: "No description — a name is required to import this item.",
      });
    }
    if (!conditionRecognized) {
      issues.push({
        code: "CONDITION_UNKNOWN",
        severity: "warning",
        field: "condition",
        message: "Condition not recognized — defaults to 'untested'.",
      });
    }
    if (!askingPrice) {
      issues.push({
        code: "MISSING_PRICE",
        severity: "warning",
        field: "askingPrice",
        message: "No asking price — item can't be approved for sale yet.",
      });
    }
    if (!serialNumber) {
      issues.push({
        code: "MISSING_SERIAL",
        severity: "info",
        field: "serialNumber",
        message: "No serial number — fine for generic items.",
      });
    }

    // (2) Location ------------------------------------------------------------
    if (wh.ambiguous) {
      issues.push({
        code: "LOCATION_AMBIGUOUS",
        severity: "error",
        field: "warehouse",
        message: "Warehouse hint matches several warehouses — pick one.",
      });
    } else if (!wh.id) {
      issues.push({
        code: "LOCATION_UNRESOLVED",
        severity: "error",
        field: "warehouse",
        message:
          "Where is this item? Assign a warehouse (shop / storage) to import.",
      });
    }
    if (wh.id && !location) {
      issues.push({
        code: "MISSING_SHELF_LOCATION",
        severity: "info",
        field: "location",
        message: "No shelf/bin — the item is findable but not pinpointed.",
      });
    }

    // (3) Duplicates ----------------------------------------------------------
    let duplicate = false;
    if (serialNumber) {
      const key = serialNumber.toLowerCase();
      if (existing.has(key)) {
        duplicate = true;
        issues.push({
          code: "DUPLICATE_SERIAL_EXISTING",
          severity: "error",
          field: "serialNumber",
          message: "An item with this serial already exists — will be skipped.",
        });
      } else if ((serialCounts.get(key) ?? 0) > 1) {
        duplicate = true;
        issues.push({
          code: "DUPLICATE_SERIAL_IN_FILE",
          severity: "warning",
          field: "serialNumber",
          message: "This serial appears more than once in the file.",
        });
      }
    }

    // (Presence) --------------------------------------------------------------
    // Always flagged: the file can't prove we still have the item.
    issues.push({
      code: "PRESENCE_UNCONFIRMED",
      severity: "warning",
      message: "Confirm the item is physically present before importing.",
    });

    const completeness = computeCompleteness({
      description,
      resolvedWarehouseId: wh.id,
      condition,
      conditionRecognized,
      askingPrice,
      serialNumber,
      location,
    });

    const hasError = issues.some((i) => i.severity === "error");
    const hasWarning = issues.some(
      (i) => i.severity === "warning" && i.code !== "PRESENCE_UNCONFIRMED",
    );
    const decision: ImportDecision = hasError
      ? "blocked"
      : hasWarning
        ? "review"
        : "ready";

    return {
      index,
      raw,
      normalized: {
        description: description ?? "",
        category,
        condition,
        serialNumber,
        askingPrice,
        estimatedValue,
        location,
        notes,
        externalRef,
      },
      resolvedWarehouseId: wh.id,
      resolvedWarehouseName: wh.name,
      issues,
      completeness,
      presenceConfirmed: false,
      decision,
    };
  });

  const summary: ImportAnalysisSummary = {
    total: rows.length,
    ready: rows.filter((r) => r.decision === "ready").length,
    review: rows.filter((r) => r.decision === "review").length,
    blocked: rows.filter((r) => r.decision === "blocked").length,
    duplicates: rows.filter((r) =>
      r.issues.some(
        (i) =>
          i.code === "DUPLICATE_SERIAL_EXISTING" ||
          i.code === "DUPLICATE_SERIAL_IN_FILE",
      ),
    ).length,
    missingLocation: rows.filter((r) => !r.resolvedWarehouseId).length,
    incomplete: rows.filter((r) => r.completeness.score < 100).length,
  };

  return { rows, summary };
}
