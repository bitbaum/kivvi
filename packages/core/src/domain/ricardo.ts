/**
 * Ricardo.ch marketplace domain functions (pure, no HTTP).
 *
 * NOTE: Ricardo API v2 endpoints are documented at https://api.ricardo.ch
 * The base URL, auth flow, and payload shape below are based on the Ricardo
 * Seller API v2 specification. Verify against current API docs before going live.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RicardoListingPayload {
  title: string;
  description: string;
  categoryId: number;
  /** CHF cents */
  price: number;
  condition: RicardoCondition;
  /**
   * ISO 8601 duration for auction length, or null for fixed-price listing.
   * e.g. "P7D" = 7 days
   */
  duration: string | null;
  isFixedPrice: boolean;
  quantity: number;
  /** Internal reference shown in seller dashboard */
  internalReference?: string;
  /** Base64-encoded JPEG, no data-URI prefix */
  imageBase64?: string;
}

export type RicardoCondition =
  | "new"
  | "used_like_new"
  | "used_good"
  | "used_acceptable"
  | "for_parts";

export interface RicardoListingResult {
  listingId: string;
  listingUrl: string;
}

export interface RicardoWebhookEvent {
  eventType: "item_sold" | "item_expired" | "item_removed" | "bid_placed";
  listingId: string;
  /** Present on item_sold */
  buyerUsername?: string;
  /** CHF decimal string — present on item_sold */
  soldPrice?: string;
  timestamp: string;
}

// ============================================================================
// CONDITION MAPPING
// ============================================================================

/** Map Kivvi item conditions to Ricardo condition codes */
export const KIVVI_TO_RICARDO_CONDITION: Record<string, RicardoCondition> = {
  like_new: "used_like_new",
  good: "used_good",
  fair: "used_acceptable",
  poor: "used_acceptable",
  parts_only: "for_parts",
  scrap: "for_parts",
  untested: "used_acceptable",
};

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

/**
 * Build the Ricardo listing payload from a Kivvi inventory item.
 * `askingPrice` is expected as a CHF decimal string (e.g. "49.50").
 */
export function buildRicardoListingPayload(item: {
  itemNumber: string;
  description: string;
  condition: string;
  askingPrice: string | null;
  photoBase64?: string | null;
  category?: string | null;
  notes?: string | null;
}): RicardoListingPayload {
  const priceChf = parseFloat(item.askingPrice ?? "0");
  const priceCents = Math.round(priceChf * 100);

  // Strip data-URI prefix for API upload
  let imageBase64: string | undefined;
  if (item.photoBase64) {
    const match = item.photoBase64.match(/^data:[^;]+;base64,(.+)$/);
    imageBase64 = match ? match[1] : item.photoBase64;
  }

  // Build description — include notes if present
  const description = [item.description, item.notes]
    .filter(Boolean)
    .join("\n\n");

  return {
    title: item.description.slice(0, 100), // Ricardo title max 100 chars
    description,
    categoryId: mapCategoryToRicardo(item.category),
    price: priceCents,
    condition: KIVVI_TO_RICARDO_CONDITION[item.condition] ?? "used_acceptable",
    duration: null,
    isFixedPrice: true,
    quantity: 1,
    internalReference: item.itemNumber,
    imageBase64,
  };
}

/**
 * Parse a Ricardo webhook payload (after HMAC verification).
 * Returns null if the payload doesn't match the expected shape.
 */
export function parseRicardoWebhookEvent(
  body: Record<string, unknown>,
): RicardoWebhookEvent | null {
  const eventType = body.event_type ?? body.eventType;
  const listingId = body.listing_id ?? body.listingId;
  if (typeof eventType !== "string" || typeof listingId !== "string") {
    return null;
  }

  const validTypes = [
    "item_sold",
    "item_expired",
    "item_removed",
    "bid_placed",
  ] as const;
  if (!validTypes.includes(eventType as never)) return null;

  return {
    eventType: eventType as RicardoWebhookEvent["eventType"],
    listingId,
    buyerUsername:
      typeof body.buyer_username === "string" ? body.buyer_username : undefined,
    soldPrice:
      typeof body.sold_price === "string" ? body.sold_price : undefined,
    timestamp:
      typeof body.timestamp === "string"
        ? body.timestamp
        : new Date().toISOString(),
  };
}

/**
 * Sign a webhook payload with HMAC-SHA256 for outgoing or verify incoming.
 * Used to produce the `X-Ricardo-Signature` header value.
 *
 * NOTE: Only call this from server-side code (Node.js runtime).
 */
export function buildWebhookSignature(secret: string, payload: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHmac } = require("crypto") as typeof import("crypto");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// ============================================================================
// CATEGORY MAPPING (Kivvi → Ricardo category IDs)
// ============================================================================

/**
 * Maps Kivvi category strings to Ricardo category IDs.
 * Ricardo category IDs: https://api.ricardo.ch/v2/categories
 * These are approximate — verify against the actual Ricardo category tree.
 */
function mapCategoryToRicardo(category: string | null | undefined): number {
  const MAP: Record<string, number> = {
    laptop: 46922, // Notebooks / Laptops
    desktop: 46923, // Desktop computers
    monitor: 46924, // Monitors
    phone: 46930, // Smartphones
    tablet: 46931, // Tablets
    printer: 46932, // Printers
    keyboard: 46935, // Input devices
    bike: 46810, // Bicycles
    clothing: 46860, // Clothing
    furniture: 46850, // Furniture
    book: 46870, // Books
    appliance: 46840, // Appliances
  };
  return MAP[category ?? ""] ?? 46800; // Fallback: "Electronics & Computers" general
}
