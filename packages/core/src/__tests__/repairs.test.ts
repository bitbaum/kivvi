import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  netVatFromGross,
  computeAppliedSubsidy,
  buildAdvanceReceiptLines,
  buildSubsidySettlementLines,
  buildRepairFinalizeLines,
  repairSourceKey,
  type JournalLineSpec,
} from "../domain/repairs";
import {
  getSubsidyProgram,
  isCategoryEligible,
  SUBSIDY_PROGRAMS,
} from "../config/subsidy-programs";

// Every posting the repair domain emits must balance to the franc (GT #2/#6).
function sum(lines: JournalLineSpec[], side: "debit" | "credit"): string {
  return lines
    .reduce((acc, l) => acc.plus(new Decimal(l[side] ?? "0")), new Decimal(0))
    .toFixed(2);
}
function expectBalanced(lines: JournalLineSpec[]) {
  expect(sum(lines, "debit")).toBe(sum(lines, "credit"));
}

describe("netVatFromGross — exact split, sums to gross", () => {
  it("splits CHF 60.00 gross at 8.1% into 55.50 + 4.50", () => {
    expect(netVatFromGross(new Decimal("60.00"), "8.1")).toEqual({
      net: "55.50",
      vat: "4.50",
    });
  });

  it("net + vat always equals the gross (no lost Rappen)", () => {
    for (const g of ["30.00", "22.50", "13.37", "99.95", "1000.00"]) {
      const { net, vat } = netVatFromGross(new Decimal(g), "8.1");
      expect(new Decimal(net).plus(vat).toFixed(2)).toBe(
        new Decimal(g).toFixed(2),
      );
    }
  });

  it("0% VAT → all net", () => {
    expect(netVatFromGross(new Decimal("50.00"), "0")).toEqual({
      net: "50.00",
      vat: "0.00",
    });
  });
});

describe("computeAppliedSubsidy — min(face, cap%), Rappen-rounded, bounded", () => {
  const zh = getSubsidyProgram("reparaturbonus_zh")!;

  it("caps at 50% of the repair (bonus 30 on a 60 repair)", () => {
    expect(computeAppliedSubsidy(zh, "60.00")).toBe("30.00");
  });

  it("is limited by the face amount on a large repair", () => {
    // 50% of 400 = 200, but face is 100 → 100.
    expect(computeAppliedSubsidy(zh, "400.00")).toBe("100.00");
  });

  it("Rappen-rounds the cap (50% of 45.03 = 22.515 → 22.50)", () => {
    expect(computeAppliedSubsidy(zh, "45.03")).toBe("22.50");
  });

  it("never negative or over the total", () => {
    expect(computeAppliedSubsidy(zh, "0.00")).toBe("0.00");
  });
});

describe("buildRepairFinalizeLines — spec §5.3 (total 60, bonus 30)", () => {
  it("subvention (b): VAT only on the customer share; bonus is non-taxable income", () => {
    const lines = buildRepairFinalizeLines({
      repairTotalGross: "60.00",
      vatRate: "8.1",
      subsidyGross: "30.00",
      advanceGross: "0.00",
      vatTreatment: "subvention",
      receivableAccountCode: "1180",
      subventionAccountCode: "3400",
    });
    expectBalanced(lines);
    // Customer share 30 gross → net 27.75 + VAT 2.25; bonus 30 → 3400 untaxed.
    const by = (code: string, side: "debit" | "credit") =>
      lines.find((l) => l.accountCode === code && l[side] != null)?.[side];
    expect(by("1100", "debit")).toBe("30.00"); // customer remaining
    expect(by("1180", "debit")).toBe("30.00"); // subsidy receivable
    expect(by("3200", "credit")).toBe("27.75"); // taxable revenue (customer share)
    expect(by("2200", "credit")).toBe("2.25"); // VAT on customer share only
    expect(by("3400", "credit")).toBe("30.00"); // non-taxable Subvention
  });

  it("third_party_consideration (a): VAT on the full repair price", () => {
    const lines = buildRepairFinalizeLines({
      repairTotalGross: "60.00",
      vatRate: "8.1",
      subsidyGross: "30.00",
      advanceGross: "0.00",
      vatTreatment: "third_party_consideration",
      receivableAccountCode: "1180",
      subventionAccountCode: "3400",
    });
    expectBalanced(lines);
    const by = (code: string, side: "debit" | "credit") =>
      lines.find((l) => l.accountCode === code && l[side] != null)?.[side];
    expect(by("1100", "debit")).toBe("30.00");
    expect(by("1180", "debit")).toBe("30.00");
    expect(by("3200", "credit")).toBe("55.50"); // full net
    expect(by("2200", "credit")).toBe("4.50"); // VAT on full total
    // No Subvention line under treatment (a).
    expect(lines.find((l) => l.accountCode === "3400")).toBeUndefined();
  });

  it("clears an advance: total 60, bonus 30, advance 22.50 → customer owes 7.50", () => {
    const lines = buildRepairFinalizeLines({
      repairTotalGross: "60.00",
      vatRate: "8.1",
      subsidyGross: "30.00",
      advanceGross: "22.50",
      vatTreatment: "third_party_consideration",
      receivableAccountCode: "1180",
      subventionAccountCode: "3400",
    });
    expectBalanced(lines);
    const by = (code: string, side: "debit" | "credit") =>
      lines.find((l) => l.accountCode === code && l[side] != null)?.[side];
    expect(by("1100", "debit")).toBe("7.50"); // 60 − 30 − 22.50
    expect(by("2030", "debit")).toBe("22.50"); // advance cleared
    expect(by("1180", "debit")).toBe("30.00");
  });

  it("plain repair, no subsidy/advance → simple revenue recognition", () => {
    const lines = buildRepairFinalizeLines({
      repairTotalGross: "108.10",
      vatRate: "8.1",
      subsidyGross: "0.00",
      advanceGross: "0.00",
      vatTreatment: "subvention",
      receivableAccountCode: "1180",
      subventionAccountCode: "3400",
    });
    expectBalanced(lines);
    const by = (code: string, side: "debit" | "credit") =>
      lines.find((l) => l.accountCode === code && l[side] != null)?.[side];
    expect(by("1100", "debit")).toBe("108.10");
    expect(by("3200", "credit")).toBe("100.00");
    expect(by("2200", "credit")).toBe("8.10");
  });
});

describe("advance + settlement postings balance", () => {
  it("advance receipt: Dr 1020 / Cr 2030", () => {
    const lines = buildAdvanceReceiptLines("22.50");
    expectBalanced(lines);
    expect(lines.find((l) => l.accountCode === "1020")?.debit).toBe("22.50");
    expect(lines.find((l) => l.accountCode === "2030")?.credit).toBe("22.50");
  });

  it("monthly settlement: Dr 1020 / Cr receivable", () => {
    const lines = buildSubsidySettlementLines("30.00", "1180");
    expectBalanced(lines);
    expect(lines.find((l) => l.accountCode === "1020")?.debit).toBe("30.00");
    expect(lines.find((l) => l.accountCode === "1180")?.credit).toBe("30.00");
  });
});

describe("subsidy program config", () => {
  it("Zürich defaults to subvention treatment, 1180 receivable (not Delkredere)", () => {
    const zh = SUBSIDY_PROGRAMS.reparaturbonus_zh;
    expect(zh.vatTreatment).toBe("subvention");
    expect(zh.receivableAccountCode).toBe("1180");
  });

  it("category eligibility is case-insensitive and gated by the list", () => {
    const zh = getSubsidyProgram("reparaturbonus_zh")!;
    expect(isCategoryEligible(zh, "Electronics")).toBe(true);
    expect(isCategoryEligible(zh, "furniture")).toBe(false);
    expect(isCategoryEligible(zh, null)).toBe(false);
  });

  it("unknown program resolves to undefined", () => {
    expect(getSubsidyProgram("nope")).toBeUndefined();
  });
});

describe("repairSourceKey — durable idempotency marker", () => {
  it("namespaces source + id", () => {
    expect(repairSourceKey("revampit", "appt_42")).toBe(
      "repair:revampit:appt_42",
    );
  });
});
