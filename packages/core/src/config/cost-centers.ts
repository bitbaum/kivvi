import type { CostCenterKind } from "@kivvi/database";

/**
 * Default analytical dimension seeded on company creation — the SSOT for the
 * operating activities a refurbisher/Verein splits its books by. Adding a new
 * activity later is one row in the settings UI, not a code change.
 *
 * `code` is a stable slug (used for lookups/imports); `name` is the display
 * label. Funds (donor-restricted, FER-21) are NOT seeded — they are created
 * per grant as the money arrives.
 */
export interface CostCenterSeed {
  code: string;
  name: string;
  kind: CostCenterKind;
}

export const DEFAULT_COST_CENTERS: readonly CostCenterSeed[] = [
  { code: "REFURB", name: "Refurbished-Verkauf", kind: "activity" },
  { code: "REPAIR", name: "Reparaturen", kind: "activity" },
  { code: "ITHELP", name: "IT-Hilfe", kind: "activity" },
  { code: "WORKSHOP", name: "Workshops & Kurse", kind: "activity" },
  { code: "MARKET", name: "Marktplatz (P2P)", kind: "activity" },
  { code: "DONATE", name: "Spenden & Förderung", kind: "activity" },
  { code: "GENERAL", name: "Allgemein / Overhead", kind: "activity" },
] as const;
