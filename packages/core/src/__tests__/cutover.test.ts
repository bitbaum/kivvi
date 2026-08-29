import { describe, it, expect } from "vitest";
import { reconcileOpenItems, importOpeningBalances } from "../domain/cutover";
import { accountSignedDelta, isDebitNormalAccount } from "../domain/accounting";
import type { Database } from "@kivvi/database";

describe("reconcileOpenItems", () => {
  it("matches when sum equals the control balance", () => {
    const r = reconcileOpenItems("1135.00", "1135.00");
    expect(r.matches).toBe(true);
    expect(r.delta).toBe("0.00");
  });

  it("flags a mismatch with the signed delta", () => {
    const r = reconcileOpenItems("1135.00", "1100.00");
    expect(r.matches).toBe(false);
    expect(r.delta).toBe("35.00");
  });

  it("tolerates sub-rappen rounding", () => {
    expect(reconcileOpenItems("100.001", "100.00").matches).toBe(true);
  });
});

describe("accountSignedDelta", () => {
  it("assets/expenses are debit-normal (debit − credit)", () => {
    expect(isDebitNormalAccount("asset")).toBe(true);
    expect(accountSignedDelta("asset", "100.00", "40.00").toFixed(2)).toBe("60.00");
    expect(accountSignedDelta("expense", "0", "10.00").toFixed(2)).toBe("-10.00");
  });

  it("liabilities/equity/revenue are credit-normal (credit − debit)", () => {
    expect(isDebitNormalAccount("liability")).toBe(false);
    expect(accountSignedDelta("liability", "40.00", "100.00").toFixed(2)).toBe("60.00");
    expect(accountSignedDelta("revenue", "0", "250.00").toFixed(2)).toBe("250.00");
  });
});

describe("importOpeningBalances", () => {
  const fakeDb = {} as unknown as Database; // never reached on the unbalanced path

  it("fails loudly when the trial balance does not balance", async () => {
    await expect(
      importOpeningBalances(fakeDb, "co-1", {
        date: "2026-01-01",
        lines: [
          { accountCode: "1020", debit: "1000.00" },
          { accountCode: "2000", credit: "900.00" }, // 100 short
        ],
      }),
    ).rejects.toMatchObject({ code: "openingBalanceUnbalanced" });
  });

  it("rejects an all-zero trial balance", async () => {
    await expect(
      importOpeningBalances(fakeDb, "co-1", {
        date: "2026-01-01",
        lines: [{ accountCode: "1020", debit: "0", credit: "0" }],
      }),
    ).rejects.toMatchObject({ code: "openingBalanceEmpty" });
  });
});
