/**
 * Ledger integrity — pure hash-chain primitives for GeBüV-immutable books (A1).
 *
 * No DB or driver dependencies (server-side only: uses node crypto). Kept pure
 * so the hash is reproducible and the chain verification is unit-testable
 * without a database — matching this package's "test the accounting math" style.
 */
import Decimal from "decimal.js";
import { createHash } from "crypto";

/** prevHash of the first posted entry in a company's chain. */
export const GENESIS_HASH = "GENESIS";

export interface HashableLine {
  accountId: string;
  debit?: string | null;
  credit?: string | null;
}

export interface HashableEntry {
  companyId: string;
  sequenceNo: number;
  date: Date | string;
  reference?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  postedAt: Date | string;
  prevHash: string;
  lines: HashableLine[];
}

function iso(d: Date | string): string {
  return (typeof d === "string" ? new Date(d) : d).toISOString();
}

/** Normalize a decimal string to fixed-2 (or null) so the hash is stable. */
function amt(v?: string | null): string | null {
  return v == null || v === "" ? null : new Decimal(v).toFixed(2);
}

/**
 * Canonical, reproducible SHA-256 over a posted entry's IMMUTABLE content.
 * Excludes the row id and the reversal-link columns (those are relationship
 * metadata, not financial content) so the hash is stable and any change to a
 * hashed field is, by design, detectable.
 */
export function computeEntryHash(entry: HashableEntry): string {
  const canonical = JSON.stringify({
    companyId: entry.companyId,
    sequenceNo: entry.sequenceNo,
    date: iso(entry.date),
    reference: entry.reference ?? null,
    sourceType: entry.sourceType ?? null,
    sourceId: entry.sourceId ?? null,
    postedAt: iso(entry.postedAt),
    prevHash: entry.prevHash,
    lines: entry.lines
      .map((l) => ({
        accountId: l.accountId,
        debit: amt(l.debit),
        credit: amt(l.credit),
      }))
      .sort((a, b) => (a.accountId < b.accountId ? -1 : a.accountId > b.accountId ? 1 : 0)),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export interface ChainEntry extends HashableEntry {
  entryHash: string;
}

export interface ChainVerification {
  ok: boolean;
  firstBrokenSequenceNo?: number;
  reason?: string;
}

/**
 * Verify a company's posted-entry chain: gap-free sequence + prevHash linkage +
 * per-entry content integrity. Returns the first break found.
 */
export function verifyChain(entries: ChainEntry[]): ChainVerification {
  const sorted = [...entries].sort((a, b) => a.sequenceNo - b.sequenceNo);
  let expectedSeq: number | null = null;
  let expectedPrev = GENESIS_HASH;
  for (const e of sorted) {
    if (expectedSeq === null) expectedSeq = e.sequenceNo; // first posted seq (usually 1)
    if (e.sequenceNo !== expectedSeq) {
      return {
        ok: false,
        firstBrokenSequenceNo: expectedSeq,
        reason: `sequence gap: expected ${expectedSeq}, got ${e.sequenceNo}`,
      };
    }
    if (e.prevHash !== expectedPrev) {
      return {
        ok: false,
        firstBrokenSequenceNo: e.sequenceNo,
        reason: "prevHash does not match the prior entry's hash (chain broken)",
      };
    }
    if (computeEntryHash(e) !== e.entryHash) {
      return {
        ok: false,
        firstBrokenSequenceNo: e.sequenceNo,
        reason: "entryHash mismatch (entry content was tampered)",
      };
    }
    expectedPrev = e.entryHash;
    expectedSeq += 1;
  }
  return { ok: true };
}
