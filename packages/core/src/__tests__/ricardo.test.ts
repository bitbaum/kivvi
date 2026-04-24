import { describe, it, expect } from "vitest";
import {
  buildRicardoListingPayload,
  parseRicardoWebhookEvent,
  buildWebhookSignature,
} from "../domain/ricardo";

describe("ricardo domain", () => {
  describe("buildRicardoListingPayload", () => {
    it("maps condition, price, category and strips data-uri photo prefix", () => {
      const payload = buildRicardoListingPayload({
        itemNumber: "IT-00042",
        description: "Lenovo ThinkPad T14 Gen 2",
        condition: "good",
        askingPrice: "149.50",
        category: "laptop",
        notes: "Fresh battery + charger included",
        photoBase64: "data:image/jpeg;base64,ABC123==",
      });

      expect(payload.price).toBe(14950);
      expect(payload.condition).toBe("used_good");
      expect(payload.categoryId).toBe(46922);
      expect(payload.internalReference).toBe("IT-00042");
      expect(payload.imageBase64).toBe("ABC123==");
      expect(payload.description).toContain("Fresh battery");
    });

    it("falls back to safe defaults for unknown category/condition", () => {
      const payload = buildRicardoListingPayload({
        itemNumber: "IT-00099",
        description: "Mystery item",
        condition: "unknown_condition",
        askingPrice: "10.00",
        category: "unknown_category",
      });

      expect(payload.condition).toBe("used_acceptable");
      expect(payload.categoryId).toBe(46800);
      expect(payload.price).toBe(1000);
    });
  });

  describe("parseRicardoWebhookEvent", () => {
    it("accepts snake_case and returns normalized event", () => {
      const event = parseRicardoWebhookEvent({
        event_type: "item_sold",
        listing_id: "abc-123",
        sold_price: "199.00",
        buyer_username: "maxmuster",
        timestamp: "2026-04-24T12:00:00Z",
      });

      expect(event).toEqual({
        eventType: "item_sold",
        listingId: "abc-123",
        soldPrice: "199.00",
        buyerUsername: "maxmuster",
        timestamp: "2026-04-24T12:00:00Z",
      });
    });

    it("returns null for invalid event type", () => {
      expect(
        parseRicardoWebhookEvent({
          event_type: "unknown",
          listing_id: "abc",
        }),
      ).toBeNull();
    });
  });

  describe("buildWebhookSignature", () => {
    it("is deterministic for identical input", () => {
      const payload = JSON.stringify({
        listing_id: "x",
        event_type: "item_sold",
      });
      const a = buildWebhookSignature("secret", payload);
      const b = buildWebhookSignature("secret", payload);

      expect(a).toHaveLength(64);
      expect(a).toBe(b);
    });
  });
});
