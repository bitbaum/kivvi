import { describe, it, expect } from "vitest";
import {
  computeEntryHash,
  verifyChain,
  GENESIS_HASH,
  type ChainEntry,
} from "../domain/ledger-hash";

const A = "11111111-1111-1111-1111-111111111111"; // account id
const B = "22222222-2222-2222-2222-222222222222";
const CO = "company-1";

function entry(
  seq: number,
  prevHash: string,
  lines: ChainEntry["lines"],
  overrides: Partial<ChainEntry> = {},
): ChainEntry {
  const base = {
    companyId: CO,
    sequenceNo: seq,
    date: new Date("2026-01-15T00:00:00.000Z"),
    reference: `RE-${seq}`,
    sourceType: "invoice_sent",
    sourceId: `src-${seq}`,
    postedAt: new Date("2026-01-15T10:00:00.000Z"),
    prevHash,
    lines,
    ...overrides,
  };
  return { ...base, entryHash: computeEntryHash(base) };
}

describe("computeEntryHash", () => {
  it("is deterministic and independent of line order", () => {
    const h1 = computeEntryHash({
      companyId: CO,
      sequenceNo: 1,
      date: new Date("2026-01-15T00:00:00.000Z"),
      reference: "RE-1",
      sourceType: "invoice_sent",
      sourceId: "s1",
      postedAt: new Date("2026-01-15T10:00:00.000Z"),
      prevHash: GENESIS_HASH,
      lines: [
        { accountId: A, debit: "100.00", credit: null },
        { accountId: B, debit: null, credit: "100.00" },
      ],
    });
    const h2 = computeEntryHash({
      companyId: CO,
      sequenceNo: 1,
      date: new Date("2026-01-15T00:00:00.000Z"),
      reference: "RE-1",
      sourceType: "invoice_sent",
      sourceId: "s1",
      postedAt: new Date("2026-01-15T10:00:00.000Z"),
      prevHash: GENESIS_HASH,
      // reversed order + non-normalized amount → same hash
      lines: [
        { accountId: B, debit: null, credit: "100" },
        { accountId: A, debit: "100.00", credit: null },
      ],
    });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when a hashed field changes (amount tamper)", () => {
    const lines = [
      { accountId: A, debit: "100.00", credit: null },
      { accountId: B, debit: null, credit: "100.00" },
    ];
    const base = {
      companyId: CO,
      sequenceNo: 1,
      date: new Date("2026-01-15T00:00:00.000Z"),
      reference: "RE-1",
      sourceType: "invoice_sent",
      sourceId: "s1",
      postedAt: new Date("2026-01-15T10:00:00.000Z"),
      prevHash: GENESIS_HASH,
      lines,
    };
    const original = computeEntryHash(base);
    const tampered = computeEntryHash({
      ...base,
      lines: [
        { accountId: A, debit: "999.00", credit: null },
        { accountId: B, debit: null, credit: "999.00" },
      ],
    });
    expect(tampered).not.toBe(original);
  });
});

describe("verifyChain", () => {
  const balanced = [
    { accountId: A, debit: "100.00", credit: null },
    { accountId: B, debit: null, credit: "100.00" },
  ];

  it("accepts a valid chain", () => {
    const e1 = entry(1, GENESIS_HASH, balanced);
    const e2 = entry(2, e1.entryHash, balanced);
    const e3 = entry(3, e2.entryHash, balanced);
    expect(verifyChain([e3, e1, e2]).ok).toBe(true); // order-independent input
  });

  it("detects a sequence gap", () => {
    const e1 = entry(1, GENESIS_HASH, balanced);
    const e3 = entry(3, e1.entryHash, balanced); // seq 2 missing
    const res = verifyChain([e1, e3]);
    expect(res.ok).toBe(false);
    expect(res.firstBrokenSequenceNo).toBe(2);
  });

  it("detects a broken hash link", () => {
    const e1 = entry(1, GENESIS_HASH, balanced);
    const e2 = entry(2, "WRONG_PREV_HASH", balanced);
    const res = verifyChain([e1, e2]);
    expect(res.ok).toBe(false);
    expect(res.firstBrokenSequenceNo).toBe(2);
  });

  it("detects content tampered after hashing", () => {
    const e1 = entry(1, GENESIS_HASH, balanced);
    // Mutate a line amount but keep the stored entryHash → mismatch.
    const tampered: ChainEntry = {
      ...e1,
      lines: [
        { accountId: A, debit: "500.00", credit: null },
        { accountId: B, debit: null, credit: "500.00" },
      ],
    };
    const res = verifyChain([tampered]);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("tampered");
  });

  it("first posted entry must chain to GENESIS", () => {
    const e1 = entry(1, "NOT_GENESIS", balanced);
    expect(verifyChain([e1]).ok).toBe(false);
  });
});
