/**
 * Payment classification — AI-assisted triage of unclear money-in events.
 *
 * When money arrives that doesn't cleanly match an open invoice, a bookkeeper
 * must decide what it is: a sale, a donation, a grant/subvention, a refund, a
 * pass-through (P2P settlement), or something needing manual review. Getting
 * this wrong has VAT and reporting consequences (Ground Truth #3 — Swiss law
 * governs), so this is DELIBERATELY advisory:
 *
 *  - Pure, deterministic rules (no LLM guessing on the booking itself).
 *  - Donation / grant / refund / pass-through always carry `requiresReview`,
 *    because the roadmap forbids automating those postings before the
 *    accounting policy is explicit and Treuhänder-approved.
 *  - The AI tool surfaces the suggestion; a human confirms the actual posting.
 */

import Decimal from "decimal.js";

/** Categories a money-in event can be triaged into. */
export const MONEY_IN_CATEGORIES = [
  "sale",
  "donation",
  "grant",
  "refund",
  "pass_through",
  "manual_review",
] as const;
export type MoneyInCategory = (typeof MONEY_IN_CATEGORIES)[number];

export type ClassificationConfidence = "high" | "medium" | "low";

/**
 * Keyword sets (Swiss-German first, then FR/EN) that hint at a category.
 * SSOT for classification vocabulary — matched case-insensitively as substrings.
 */
export const CLASSIFICATION_KEYWORDS = {
  grant: ["subvention", "förder", "beitrag", "kanton", "gemeinde", "stiftung", "grant", "subside"],
  donation: ["spende", "donation", "don ", "gönner", "collecte", "legat"],
  refund: [
    "rückerstattung",
    "rueckerstattung",
    "erstattung",
    "storno",
    "refund",
    "remboursement",
    "gutschrift",
  ],
} as const;

export interface MoneyInSignals {
  /** Decimal string; negative or zero is treated as an outflow/refund. */
  amount: string;
  description?: string | null;
  counterparty?: string | null;
  /** Set when the money matches an open invoice (QR reference / amount match). */
  matchedInvoiceId?: string | null;
  /** True when this is a facilitated P2P / agency settlement (not own revenue). */
  isPassThrough?: boolean;
}

export interface MoneyInClassification {
  category: MoneyInCategory;
  confidence: ClassificationConfidence;
  reason: string;
  /** Treuhänder gate: true means "do not auto-post, a human must confirm". */
  requiresReview: boolean;
}

function haystack(signals: MoneyInSignals): string {
  return `${signals.description ?? ""} ${signals.counterparty ?? ""}`.toLowerCase();
}

function matchesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

/**
 * Classify a money-in event from its signals. Order encodes priority: the
 * safest / most-specific interpretation wins, and every ambiguous or
 * policy-gated outcome is flagged for human review.
 */
export function classifyMoneyIn(signals: MoneyInSignals): MoneyInClassification {
  const text = haystack(signals);
  // Money is not a float (Ground Truth #2): compare via Decimal. A malformed
  // amount is not treated as an outflow — it falls through to keyword/invoice
  // logic rather than being silently coerced (as parseFloat would).
  let isOutflow = false;
  try {
    isOutflow = new Decimal(signals.amount).lte(0);
  } catch {
    isOutflow = false;
  }

  // 1. Explicit pass-through / agency settlement — never own revenue.
  if (signals.isPassThrough) {
    return {
      category: "pass_through",
      confidence: "high",
      reason:
        "Flagged as a facilitated P2P/agency settlement — book only commission, not full revenue.",
      requiresReview: true,
    };
  }

  // 2. Refund — outflow or explicit reversal wording.
  if (isOutflow || matchesAny(text, CLASSIFICATION_KEYWORDS.refund)) {
    return {
      category: "refund",
      confidence: isOutflow ? "high" : "medium",
      reason: isOutflow
        ? "Amount is an outflow — likely a refund or reversal."
        : "Description mentions a reversal/refund.",
      requiresReview: true,
    };
  }

  // 3. Grant / subvention — Treuhänder-gated VAT treatment (Art. 18 Abs. 2 MWSTG).
  if (matchesAny(text, CLASSIFICATION_KEYWORDS.grant)) {
    return {
      category: "grant",
      confidence: "medium",
      reason:
        "Wording suggests a grant/subvention — VAT and reporting treatment needs a Treuhänder decision.",
      requiresReview: true,
    };
  }

  // 4. Donation / Spende — non-consideration, special VAT treatment.
  if (matchesAny(text, CLASSIFICATION_KEYWORDS.donation)) {
    return {
      category: "donation",
      confidence: "medium",
      reason: "Wording suggests a donation — confirm it is non-consideration before booking.",
      requiresReview: true,
    };
  }

  // 5. Clean sale — money matches an open invoice.
  if (signals.matchedInvoiceId) {
    return {
      category: "sale",
      confidence: "high",
      reason: "Matches an open invoice — book as sales revenue / payment.",
      requiresReview: false,
    };
  }

  // 6. Nothing conclusive — a human must decide.
  return {
    category: "manual_review",
    confidence: "low",
    reason: "No matching invoice and no distinctive wording — classify manually.",
    requiresReview: true,
  };
}
