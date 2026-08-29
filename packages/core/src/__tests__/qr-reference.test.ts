import { describe, it, expect } from "vitest";
import { generateQRReference } from "../domain/documents";

describe("generateQRReference", () => {
  it("returns exactly 27 digits", () => {
    const ref = generateQRReference("company-123", "RE-2026-00001");
    expect(ref).toHaveLength(27);
    expect(ref).toMatch(/^\d{27}$/);
  });

  it("returns only numeric characters", () => {
    const ref = generateQRReference("abc-def-ghi", "AN-2026-00099");
    expect(ref).toMatch(/^\d+$/);
  });

  it("produces deterministic output for same inputs", () => {
    const ref1 = generateQRReference("company-a", "RE-2026-00042");
    const ref2 = generateQRReference("company-a", "RE-2026-00042");
    expect(ref1).toBe(ref2);
  });

  it("produces different references for different companies", () => {
    const ref1 = generateQRReference("company-a", "RE-2026-00001");
    const ref2 = generateQRReference("company-b", "RE-2026-00001");
    expect(ref1).not.toBe(ref2);
  });

  it("produces different references for different document numbers", () => {
    const ref1 = generateQRReference("company-a", "RE-2026-00001");
    const ref2 = generateQRReference("company-a", "RE-2026-00002");
    expect(ref1).not.toBe(ref2);
  });

  it("has valid MOD-10 check digit", () => {
    const ref = generateQRReference("test-company", "RE-2026-00123");
    // Verify check digit by re-running MOD-10 on the first 26 digits
    const base = ref.slice(0, 26);
    const checkDigit = ref[26];

    const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
    let carry = 0;
    for (let i = 0; i < base.length; i++) {
      carry = table[(carry + parseInt(base[i], 10)) % 10];
    }
    const expected = ((10 - carry) % 10).toString();

    expect(checkDigit).toBe(expected);
  });

  it("handles UUID-style company IDs", () => {
    const ref = generateQRReference("550e8400-e29b-41d4-a716-446655440000", "RE-2026-00001");
    expect(ref).toHaveLength(27);
    expect(ref).toMatch(/^\d{27}$/);
  });

  it("handles document numbers with varying formats", () => {
    const ref1 = generateQRReference("co", "RE-2026-00001");
    const ref2 = generateQRReference("co", "12345");
    const ref3 = generateQRReference("co", "GU-2026-99999");

    expect(ref1).toHaveLength(27);
    expect(ref2).toHaveLength(27);
    expect(ref3).toHaveLength(27);
  });

  it("embeds document number digits in positions 10-25", () => {
    const ref = generateQRReference("company", "RE-2026-00001");
    // Document part = numeric only from "RE-2026-00001" → "202600001"
    // Padded to 16 digits → "0000000202600001"
    const docPart = ref.slice(10, 26);
    expect(docPart).toBe("0000000202600001");
  });
});
