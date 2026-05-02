/**
 * Default CO2 savings per item category (kg CO2 avoided vs buying new).
 *
 * Based on lifecycle assessment research:
 * - Laptops: ~300 kg CO2 to manufacture new (Fraunhofer IZM 2019)
 * - Desktops: ~500 kg CO2 to manufacture new
 * - Monitors: ~200 kg CO2 to manufacture new
 * - Phones/tablets: ~70 kg CO2 to manufacture new
 * - Peripherals (keyboard/mouse): ~10 kg
 * - Clothing: ~20 kg per item (Ellen MacArthur Foundation)
 * - Furniture: ~100 kg per item
 * - Books: ~2 kg
 * - Appliances: ~100 kg (typical small-medium household appliance)
 *
 * Conservative estimates — companies can adjust via settings.
 *
 * SSOT: These keys must match ITEM_CATEGORIES from checklist-templates.ts.
 * When adding a new category there, add a CO2 factor here too.
 * The invariant is enforced by packages/core/src/__tests__/co2-factors.test.ts.
 */
export const CO2_FACTORS_KG: Record<string, number> = {
  laptop: 300,
  desktop: 500,
  monitor: 200,
  phone: 70,
  tablet: 70,
  server: 800,
  printer: 150,
  keyboard: 10,
  mouse: 5,
  peripheral: 10,
  networking: 50,
  clothing: 20,
  furniture: 100,
  book: 2,
  toy: 5,
  bike: 80,
  appliance: 100, // typical small-medium household appliance
  electronics: 50, // generic fallback for electronics
  other: 50, // default fallback
};

/** Default when category is unknown or null */
export const CO2_DEFAULT_KG = 50;

/** Equivalence factors for human-readable CO2 impact display */
export const CO2_TREE_KG_PER_YEAR = 21; // kg CO2 absorbed by one tree per year
export const CO2_CAR_KG_PER_KM = 0.21; // kg CO2 emitted per km driven (avg European car)

/** Resolve CO2 factor for a given category, with company override support */
export function getCo2Factor(
  category: string | null | undefined,
  overrides?: Record<string, number>,
): number {
  const cat = (category || "other").toLowerCase();
  if (overrides?.[cat] !== undefined) return overrides[cat];
  return CO2_FACTORS_KG[cat] ?? CO2_DEFAULT_KG;
}
