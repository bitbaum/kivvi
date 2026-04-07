import { XMLParser } from "fast-xml-parser";
import { DEFAULT_CURRENCY } from "../config/locale";

// ============================================================================
// TYPES
// ============================================================================

export interface CamtBalance {
  amount: string;
  currency: string;
  date: string;
  creditDebit: "CRDT" | "DBIT";
}

export interface CamtEntry {
  entryReference: string | null;
  bookingDate: string;
  valueDate: string | null;
  amount: string;
  currency: string;
  status: string;
  description: string;
  reference: string | null;
  debtorName: string | null;
  creditorName: string | null;
  remittanceInfo: string | null;
  isReversal: boolean;
}

export interface CamtStatement {
  messageType: "camt.053" | "camt.054";
  accountIban: string | null;
  accountCurrency: string | null;
  openingBalance: CamtBalance | null;
  closingBalance: CamtBalance | null;
  entries: CamtEntry[];
}

// ============================================================================
// PARSER
// ============================================================================

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  isArray: (name) => name === "Ntry" || name === "TxDtls" || name === "Bal",
  numberParseOptions: { hex: false, leadingZeros: false, skipLike: /.*/ },
  parseTagValue: false,
});

/**
 * Parse a CAMT.053 or CAMT.054 XML string into a structured statement.
 * Pure function — no DB access.
 */
export function parseCamtXml(xml: string): CamtStatement {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml);
  } catch {
    throw new Error("Invalid XML: failed to parse");
  }

  const doc = parsed?.Document as Record<string, unknown> | undefined;
  if (!doc) {
    throw new Error("Invalid CAMT XML: missing Document root element");
  }

  // Detect message type: camt.053 vs camt.054
  const stmt053 = doc.BkToCstmrStmt as Record<string, unknown> | undefined;
  const ntfctn054 = doc.BkToCstmrDbtCdtNtfctn as
    | Record<string, unknown>
    | undefined;

  if (stmt053) {
    return parseStatement(stmt053.Stmt as Record<string, unknown>, "camt.053");
  }
  if (ntfctn054) {
    return parseStatement(
      ntfctn054.Ntfctn as Record<string, unknown>,
      "camt.054",
    );
  }

  throw new Error("Invalid CAMT XML: not a camt.053 or camt.054 document");
}

function parseStatement(
  stmt: Record<string, unknown>,
  messageType: "camt.053" | "camt.054",
): CamtStatement {
  if (!stmt) {
    throw new Error(`Invalid CAMT XML: missing statement body`);
  }

  // Account IBAN
  const acct = stmt.Acct as Record<string, unknown> | undefined;
  const acctId = acct?.Id as Record<string, unknown> | undefined;
  const accountIban = normalizeIban((acctId?.IBAN as string) || "") || null;
  const accountCurrency = (acct?.Ccy as string) || null;

  // Balances (camt.053 only)
  let openingBalance: CamtBalance | null = null;
  let closingBalance: CamtBalance | null = null;

  if (messageType === "camt.053") {
    const balances = ensureArray(
      stmt.Bal as
        | Record<string, unknown>[]
        | Record<string, unknown>
        | undefined,
    );
    for (const bal of balances) {
      const tp = bal?.Tp as Record<string, unknown> | undefined;
      const cdOrPrtry = tp?.CdOrPrtry as Record<string, unknown> | undefined;
      const code = cdOrPrtry?.Cd as string;
      const amt = bal?.Amt as Record<string, unknown> | undefined;
      const dt = bal?.Dt as Record<string, unknown> | undefined;

      const balanceObj: CamtBalance = {
        amount: String(amt?.["#text"] ?? amt ?? "0"),
        currency: String(amt?.["@_Ccy"] ?? ""),
        date: String(dt?.Dt ?? dt?.DtTm ?? ""),
        creditDebit: (bal?.CdtDbtInd as string) === "DBIT" ? "DBIT" : "CRDT",
      };

      if (code === "OPBD" || code === "PRCD") {
        openingBalance = balanceObj;
      } else if (code === "CLBD" || code === "CLAV") {
        closingBalance = balanceObj;
      }
    }
  }

  // Entries
  const rawEntries = ensureArray(
    stmt.Ntry as
      | Record<string, unknown>[]
      | Record<string, unknown>
      | undefined,
  );
  const entries: CamtEntry[] = [];

  for (const ntry of rawEntries) {
    const entry = parseEntry(ntry);
    // Only include BOOK status entries
    if (entry.status === "BOOK") {
      entries.push(entry);
    }
  }

  return {
    messageType,
    accountIban,
    accountCurrency,
    openingBalance,
    closingBalance,
    entries,
  };
}

function parseEntry(ntry: Record<string, unknown>): CamtEntry {
  // Entry reference (AcctSvcrRef) — dedup key
  const entryReference = (ntry.AcctSvcrRef as string) || null;

  // Status
  const status = (ntry.Sts as string) || "BOOK";

  // Dates
  const bookDt = ntry.BookgDt as Record<string, unknown> | undefined;
  const bookingDate = String(bookDt?.Dt ?? bookDt?.DtTm ?? "");

  const valDt = ntry.ValDt as Record<string, unknown> | undefined;
  const valueDate =
    (valDt?.Dt ?? valDt?.DtTm) ? String(valDt?.Dt ?? valDt?.DtTm) : null;

  // Amount + direction
  const amt = ntry.Amt as Record<string, unknown> | undefined;
  const rawAmount = String(amt?.["#text"] ?? amt ?? "0");
  const currency = String(amt?.["@_Ccy"] ?? DEFAULT_CURRENCY);
  const creditDebit = ntry.CdtDbtInd as string;
  const isReversal = ntry.RvslInd === true || ntry.RvslInd === "true";

  let signedAmount = rawAmount;
  // DBIT = money leaving account → negative
  const isDebit = creditDebit === "DBIT";
  if (isDebit && !isReversal) {
    signedAmount = `-${rawAmount}`;
  } else if (!isDebit && isReversal) {
    // Credit reversal = effectively debit
    signedAmount = `-${rawAmount}`;
  }

  // Transaction details
  const ntryDtls = ntry.NtryDtls as Record<string, unknown> | undefined;
  const txDtlsList = ensureArray(
    ntryDtls?.TxDtls as
      | Record<string, unknown>[]
      | Record<string, unknown>
      | undefined,
  );

  let reference: string | null = null;
  let debtorName: string | null = null;
  let creditorName: string | null = null;
  let remittanceInfo: string | null = null;
  const descriptionParts: string[] = [];

  for (const txDtls of txDtlsList) {
    // QR reference: CdtrRefInf/Ref (priority) → EndToEndId (fallback)
    const rmtInf = txDtls.RmtInf as Record<string, unknown> | undefined;
    const strd = rmtInf?.Strd as Record<string, unknown> | undefined;
    const cdtrRefInf = strd?.CdtrRefInf as Record<string, unknown> | undefined;
    const qrRef = cdtrRefInf?.Ref as string | undefined;

    const refs = txDtls.Refs as Record<string, unknown> | undefined;
    const endToEndId = refs?.EndToEndId as string | undefined;

    if (!reference && qrRef) {
      reference = qrRef;
    } else if (!reference && endToEndId && endToEndId !== "NOTPROVIDED") {
      reference = endToEndId;
    }

    // Debtor/creditor
    const dbtr = txDtls.RltdPties as Record<string, unknown> | undefined;
    const debtorParty = dbtr?.Dbtr as Record<string, unknown> | undefined;
    const creditorParty = dbtr?.Cdtr as Record<string, unknown> | undefined;

    if (!debtorName && debtorParty?.Nm) {
      debtorName = String(debtorParty.Nm);
    }
    if (!creditorName && creditorParty?.Nm) {
      creditorName = String(creditorParty.Nm);
    }

    // Unstructured remittance info
    const ustrd = rmtInf?.Ustrd as string | string[] | undefined;
    if (!remittanceInfo && ustrd) {
      remittanceInfo = Array.isArray(ustrd) ? ustrd.join(" ") : String(ustrd);
    }

    // Build description parts
    if (debtorParty?.Nm) descriptionParts.push(String(debtorParty.Nm));
    if (creditorParty?.Nm) descriptionParts.push(String(creditorParty.Nm));
    if (ustrd) {
      const text = Array.isArray(ustrd) ? ustrd.join(" ") : String(ustrd);
      descriptionParts.push(text);
    }
  }

  // Fallback description from AddtlNtryInf
  const addtlInfo = ntry.AddtlNtryInf as string | undefined;
  if (addtlInfo) {
    descriptionParts.push(addtlInfo);
  }

  // Deduplicate description parts
  const uniqueParts = [...new Set(descriptionParts)];
  const description = uniqueParts.join(" — ") || "";

  return {
    entryReference,
    bookingDate,
    valueDate,
    amount: signedAmount,
    currency,
    status,
    description,
    reference,
    debtorName,
    creditorName,
    remittanceInfo,
    isReversal,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Normalize IBAN: strip spaces, uppercase. */
export function normalizeIban(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase();
}

/** Ensure a value is always an array. */
function ensureArray<T>(value: T[] | T | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
