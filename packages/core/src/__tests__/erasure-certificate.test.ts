import { describe, it, expect } from "vitest";
import { buildCertificateNumber } from "../domain/erasure-certificate";

describe("buildCertificateNumber", () => {
  it("returns CERT-{itemNumber}-{YYYYMMDD} format", () => {
    const result = buildCertificateNumber("INV-00123", new Date("2026-03-15T10:00:00Z"));
    expect(result).toMatch(/^CERT-INV-00123-\d{8}$/);
  });

  it("formats date as YYYYMMDD with no separators", () => {
    const result = buildCertificateNumber("X", new Date("2026-01-07T00:00:00Z"));
    expect(result).toBe("CERT-X-20260107");
  });

  it("zero-pads single-digit month and day", () => {
    const result = buildCertificateNumber("A", new Date("2026-09-05T12:00:00Z"));
    expect(result).toBe("CERT-A-20260905");
  });

  it("preserves the item number exactly", () => {
    const result = buildCertificateNumber("INV-2026-00042", new Date("2026-06-15T00:00:00Z"));
    expect(result.startsWith("CERT-INV-2026-00042-")).toBe(true);
  });

  it("produces different numbers for different dates", () => {
    const a = buildCertificateNumber("ITEM-1", new Date("2026-01-01T00:00:00Z"));
    const b = buildCertificateNumber("ITEM-1", new Date("2026-01-02T00:00:00Z"));
    expect(a).not.toBe(b);
  });

  it("produces different numbers for different item numbers", () => {
    const date = new Date("2026-06-01T00:00:00Z");
    const a = buildCertificateNumber("ITEM-1", date);
    const b = buildCertificateNumber("ITEM-2", date);
    expect(a).not.toBe(b);
  });

  it("is deterministic for the same inputs", () => {
    const date = new Date("2026-04-27T08:00:00Z");
    expect(buildCertificateNumber("INV-99", date)).toBe(buildCertificateNumber("INV-99", date));
  });
});
