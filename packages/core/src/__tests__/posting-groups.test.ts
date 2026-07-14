import { describe, it, expect } from "vitest";
import { pickRevenueAccountCode } from "../domain/posting-groups";

describe("pickRevenueAccountCode — resolution precedence", () => {
  it("line override wins over everything", () => {
    expect(
      pickRevenueAccountCode({
        itemAccountCode: "3510",
        productAccountCode: "3100",
        groupAccountCode: "3000",
        defaultAccountCode: "3000",
        productType: "service",
      }),
    ).toBe("3510");
  });

  it("product posting group beats group + default", () => {
    expect(
      pickRevenueAccountCode({
        itemAccountCode: null,
        productAccountCode: "3400",
        groupAccountCode: "3100",
        defaultAccountCode: "3000",
        productType: "product",
      }),
    ).toBe("3400");
  });

  it("product-group default beats company default", () => {
    expect(
      pickRevenueAccountCode({
        groupAccountCode: "3100",
        defaultAccountCode: "3000",
        productType: "product",
      }),
    ).toBe("3100");
  });

  it("company default used when no posting group on the line", () => {
    expect(
      pickRevenueAccountCode({
        defaultAccountCode: "3050",
        productType: "product",
      }),
    ).toBe("3050");
  });

  it("legacy fallback: product → 3000 when nothing configured", () => {
    expect(pickRevenueAccountCode({ productType: "product" })).toBe("3000");
  });

  it("legacy fallback: service → 3200 when nothing configured", () => {
    expect(pickRevenueAccountCode({ productType: "service" })).toBe("3200");
  });

  it("legacy fallback: unknown/null type → 3000", () => {
    expect(pickRevenueAccountCode({ productType: null })).toBe("3000");
    expect(pickRevenueAccountCode({})).toBe("3000");
  });
});
