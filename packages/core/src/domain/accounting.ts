import { z } from "zod";
import Decimal from "decimal.js";
import { eq, and, asc, desc, sql, ilike, between, inArray, lte, gte, isNotNull } from "drizzle-orm";
import {
  accounts,
  journalEntries,
  journalLines,
  fiscalYears,
  fiscalPeriods,
  ledgerHeads,
  auditLog,
} from "@kivvi/database";
import {
  GENESIS_HASH,
  computeEntryHash,
  verifyChain,
  type ChainEntry,
  type ChainVerification,
} from "./ledger-hash";
import type {
  Database,
  Account,
  AccountType,
  JournalEntry,
  JournalLine,
  FiscalYear,
  FiscalPeriod,
} from "@kivvi/database";
import { ACCOUNT_TYPE_VALUES } from "@kivvi/database/src/enums";
import { DomainError } from "../domain-error";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createAccountSchema = z.object({
  code: z.string().min(1, "Code is required").max(10),
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(ACCOUNT_TYPE_VALUES),
  parentId: z.string().uuid().optional().nullable(),
});

export const updateAccountSchema = createAccountSchema.partial();

export const journalLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.string().optional().nullable(),
  credit: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const createJournalEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  lines: z.array(journalLineSchema).min(2, "At least 2 lines required"),
});

export const createFiscalYearSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export async function listAccounts(
  db: Database,
  companyId: string,
  filters?: { type?: AccountType; search?: string; isActive?: boolean },
): Promise<Account[]> {
  const conditions = [eq(accounts.companyId, companyId)];

  if (filters?.type) {
    conditions.push(eq(accounts.type, filters.type));
  }
  if (filters?.search) {
    conditions.push(
      sql`(${accounts.code} ILIKE ${`%${filters.search}%`} OR ${accounts.name} ILIKE ${`%${filters.search}%`})`,
    );
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(accounts.isActive, filters.isActive));
  }

  return db
    .select()
    .from(accounts)
    .where(and(...conditions))
    .orderBy(asc(accounts.code));
}

export async function getAccount(
  db: Database,
  companyId: string,
  accountId: string,
): Promise<Account | null> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.companyId, companyId)));
  return account || null;
}

export async function createAccount(
  db: Database,
  companyId: string,
  input: z.infer<typeof createAccountSchema>,
): Promise<Account> {
  const validated = createAccountSchema.parse(input);

  // Check for duplicate code
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.companyId, companyId), eq(accounts.code, validated.code)));
  if (existing) {
    throw new DomainError(
      "accountCodeExists",
      { code: validated.code },
      `Account with code ${validated.code} already exists`,
    );
  }

  const [account] = await db
    .insert(accounts)
    .values({
      companyId,
      code: validated.code,
      name: validated.name,
      type: validated.type,
      parentId: validated.parentId || null,
    })
    .returning();

  return account;
}

export async function updateAccount(
  db: Database,
  companyId: string,
  accountId: string,
  input: z.infer<typeof updateAccountSchema>,
): Promise<Account> {
  const validated = updateAccountSchema.parse(input);

  // If changing code, check for duplicates
  if (validated.code) {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.companyId, companyId),
          eq(accounts.code, validated.code),
          sql`${accounts.id} != ${accountId}`,
        ),
      );
    if (existing) {
      throw new DomainError(
        "accountCodeExists",
        { code: validated.code },
        `Account with code ${validated.code} already exists`,
      );
    }
  }

  const [account] = await db
    .update(accounts)
    .set(validated)
    .where(and(eq(accounts.id, accountId), eq(accounts.companyId, companyId)))
    .returning();

  if (!account) throw new Error("Account not found");
  return account;
}

export async function toggleAccount(
  db: Database,
  companyId: string,
  accountId: string,
): Promise<Account> {
  const account = await getAccount(db, companyId, accountId);
  if (!account) throw new Error("Account not found");

  const [updated] = await db
    .update(accounts)
    .set({ isActive: !account.isActive })
    .where(and(eq(accounts.id, accountId), eq(accounts.companyId, companyId)))
    .returning();

  return updated;
}

/**
 * Seed default Swiss KMU chart of accounts for a company.
 */
export async function seedChartOfAccounts(db: Database, companyId: string): Promise<number> {
  // Dynamic import to avoid bundling seed data unless needed
  const { SWISS_KMU_ACCOUNTS } = await import("@kivvi/database/src/seeds/swiss-kmu-kontenrahmen");

  const values = SWISS_KMU_ACCOUNTS.map((a) => ({
    companyId,
    code: a.code,
    name: a.name,
    type: a.type,
  }));

  await db.insert(accounts).values(values).onConflictDoNothing();
  return values.length;
}

// ============================================================================
// PURE HELPERS (no DB access — testable without database)
// ============================================================================

/**
 * Validate that journal entry lines balance (debits === credits within rounding tolerance).
 * Returns { valid, totalDebits, totalCredits } without touching the database.
 */
export function validateJournalBalance(
  lines: Array<{ debit?: string | null; credit?: string | null }>,
): { valid: boolean; totalDebits: string; totalCredits: string } {
  const totalDebits = lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.debit || "0")),
    new Decimal(0),
  );
  const totalCredits = lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.credit || "0")),
    new Decimal(0),
  );

  return {
    valid: totalDebits.minus(totalCredits).abs().lte("0.005"),
    totalDebits: totalDebits.toFixed(2),
    totalCredits: totalCredits.toFixed(2),
  };
}

/**
 * Generate 12 monthly fiscal periods from a start date.
 * Returns an array of { name, startDate, endDate } with German month names.
 * Pure date math — no DB access.
 */
export function generateFiscalPeriods(
  startDateStr: string,
): Array<{ name: string; startDate: string; endDate: string }> {
  const start = new Date(startDateStr);
  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  const periods: Array<{ name: string; startDate: string; endDate: string }> = [];

  // Format as YYYY-MM-DD using local date parts (not UTC — toISOString shifts dates in CET)
  const fmtDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  for (let i = 0; i < 12; i++) {
    const periodStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const periodEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);

    periods.push({
      name: `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`,
      startDate: fmtDate(periodStart),
      endDate: fmtDate(periodEnd),
    });
  }

  return periods;
}

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export interface JournalEntryWithLines extends JournalEntry {
  lines: (JournalLine & { account?: Account })[];
}

export interface JournalEntryFilters {
  dateFrom?: string;
  dateTo?: string;
  sourceType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listJournalEntries(
  db: Database,
  companyId: string,
  filters?: JournalEntryFilters,
): Promise<{
  data: JournalEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 25;

  const conditions = [eq(journalEntries.companyId, companyId)];

  if (filters?.dateFrom && filters?.dateTo) {
    conditions.push(
      between(journalEntries.date, new Date(filters.dateFrom), new Date(filters.dateTo)),
    );
  } else if (filters?.dateFrom) {
    conditions.push(sql`${journalEntries.date} >= ${new Date(filters.dateFrom)}`);
  } else if (filters?.dateTo) {
    conditions.push(sql`${journalEntries.date} <= ${new Date(filters.dateTo)}`);
  }

  if (filters?.sourceType) {
    conditions.push(eq(journalEntries.sourceType, filters.sourceType));
  }

  if (filters?.search) {
    conditions.push(
      sql`(${journalEntries.reference} ILIKE ${`%${filters.search}%`} OR ${journalEntries.description} ILIKE ${`%${filters.search}%`})`,
    );
  }

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journalEntries)
    .where(whereClause);

  const data = await db
    .select()
    .from(journalEntries)
    .where(whereClause)
    .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

export async function getJournalEntry(
  db: Database,
  companyId: string,
  entryId: string,
): Promise<JournalEntryWithLines | null> {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.companyId, companyId)));

  if (!entry) return null;

  const lines = await db
    .select({
      id: journalLines.id,
      journalEntryId: journalLines.journalEntryId,
      accountId: journalLines.accountId,
      costCenterId: journalLines.costCenterId,
      fundId: journalLines.fundId,
      debit: journalLines.debit,
      credit: journalLines.credit,
      description: journalLines.description,
      account: accounts,
    })
    .from(journalLines)
    .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(eq(journalLines.journalEntryId, entryId))
    .orderBy(asc(journalLines.id));

  return {
    ...entry,
    lines: lines.map((l) => ({
      id: l.id,
      journalEntryId: l.journalEntryId,
      accountId: l.accountId,
      costCenterId: l.costCenterId,
      fundId: l.fundId,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      account: l.account || undefined,
    })),
  };
}

// ============================================================================
// IMMUTABLE POSTING (GeBüV — A1). Every posted entry is hash-chained and
// serialized per company; posted entries are never edited/deleted, only
// reversed (Storno). See ledger-hash.ts and IMMUTABLE_BOOKS_SPEC.md.
// ============================================================================

/** The transaction type drizzle passes to db.transaction / tx.transaction. */
type LedgerTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

interface PostLine {
  accountId: string;
  costCenterId?: string | null;
  debit?: string | null;
  credit?: string | null;
  description?: string | null;
}

interface PostInput {
  companyId: string;
  date: Date;
  reference?: string | null;
  description?: string | null;
  sourceType: string;
  sourceId?: string | null;
  createdBy?: string | null;
  lines: PostLine[];
  /** Set on a reversal entry → the entry it reverses. */
  reversesEntryId?: string | null;
  /** Audit metadata. */
  actorUserId?: string | null;
  auditAction?: string;
}

/** Reject a posting whose date falls in a closed fiscal year or period. */
async function assertPeriodOpenTx(tx: LedgerTx, companyId: string, date: Date): Promise<void> {
  const dateStr = date.toISOString().slice(0, 10);
  const [closedYear] = await tx
    .select({ id: fiscalYears.id })
    .from(fiscalYears)
    .where(
      and(
        eq(fiscalYears.companyId, companyId),
        eq(fiscalYears.isClosed, true),
        lte(fiscalYears.startDate, dateStr),
        gte(fiscalYears.endDate, dateStr),
      ),
    )
    .limit(1);
  if (closedYear) {
    throw new DomainError(
      "periodClosed",
      { date: dateStr },
      "Cannot post into a closed fiscal year; reverse into the open period instead.",
    );
  }
  const [closedPeriod] = await tx
    .select({ id: fiscalPeriods.id })
    .from(fiscalPeriods)
    .innerJoin(fiscalYears, eq(fiscalPeriods.fiscalYearId, fiscalYears.id))
    .where(
      and(
        eq(fiscalYears.companyId, companyId),
        eq(fiscalPeriods.isClosed, true),
        lte(fiscalPeriods.startDate, dateStr),
        gte(fiscalPeriods.endDate, dateStr),
      ),
    )
    .limit(1);
  if (closedPeriod) {
    throw new DomainError(
      "periodClosed",
      { date: dateStr },
      "Cannot post into a closed period; reverse into the open period instead.",
    );
  }
}

/**
 * Post a journal entry immutably: serialize on the per-company ledger head,
 * assign gap-free sequenceNo + prevHash + entryHash, insert entry+lines, advance
 * the head, and append one audit row. Runs inside the given transaction so the
 * chain stays consistent even under concurrency and when nested in a larger tx.
 */
async function postEntryTx(tx: LedgerTx, input: PostInput): Promise<JournalEntry> {
  await assertPeriodOpenTx(tx, input.companyId, input.date);

  // Lock (and lazily create) the company's ledger head — the serialization point.
  await tx.insert(ledgerHeads).values({ companyId: input.companyId }).onConflictDoNothing();
  const [head] = await tx
    .select()
    .from(ledgerHeads)
    .where(eq(ledgerHeads.companyId, input.companyId))
    .for("update");

  const sequenceNo = (head?.lastSequenceNo ?? 0) + 1;
  const prevHash = head?.lastHash ?? GENESIS_HASH;
  const postedAt = new Date();
  const entryHash = computeEntryHash({
    companyId: input.companyId,
    sequenceNo,
    date: input.date,
    reference: input.reference ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    postedAt,
    prevHash,
    lines: input.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
    })),
  });

  const [entry] = await tx
    .insert(journalEntries)
    .values({
      companyId: input.companyId,
      date: input.date,
      reference: input.reference ?? null,
      description: input.description ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      createdBy: input.createdBy ?? null,
      postedAt,
      sequenceNo,
      prevHash,
      entryHash,
      reversesEntryId: input.reversesEntryId ?? null,
    })
    .returning();

  await tx.insert(journalLines).values(
    input.lines.map((line) => ({
      journalEntryId: entry.id,
      accountId: line.accountId,
      costCenterId: line.costCenterId ?? null,
      debit: line.debit || null,
      credit: line.credit || null,
      description: line.description || null,
    })),
  );

  await tx
    .update(ledgerHeads)
    .set({
      lastSequenceNo: sequenceNo,
      lastHash: entryHash,
      updatedAt: new Date(),
    })
    .where(eq(ledgerHeads.companyId, input.companyId));

  await tx.insert(auditLog).values({
    companyId: input.companyId,
    actorUserId: input.actorUserId ?? input.createdBy ?? null,
    action: input.auditAction ?? "journal.posted",
    entityType: "journal_entry",
    entityId: entry.id,
    detail: {
      sequenceNo,
      sourceType: input.sourceType,
      reference: input.reference ?? null,
    },
  });

  return entry;
}

/** Post a journal entry in its own (possibly nested) transaction. */
async function postJournalEntry(db: Database, input: PostInput): Promise<JournalEntry> {
  return db.transaction((tx) => postEntryTx(tx, input));
}

export async function createJournalEntry(
  db: Database,
  companyId: string,
  userId: string,
  input: z.infer<typeof createJournalEntrySchema>,
): Promise<JournalEntry> {
  const validated = createJournalEntrySchema.parse(input);

  // Validate debits = credits
  const balance = validateJournalBalance(validated.lines);
  if (!balance.valid) {
    throw new DomainError(
      "journalMustBalance",
      { debits: balance.totalDebits, credits: balance.totalCredits },
      `Journal entry must balance. Debits: ${balance.totalDebits}, Credits: ${balance.totalCredits}`,
    );
  }

  return postJournalEntry(db, {
    companyId,
    date: new Date(validated.date),
    reference: validated.reference || null,
    description: validated.description,
    sourceType: "manual",
    createdBy: userId,
    actorUserId: userId,
    lines: validated.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit || null,
      credit: line.credit || null,
      description: line.description || null,
    })),
  });
}

/**
 * Auto-generate journal entry from a document event (e.g. invoice sent, payment recorded).
 */
export async function createAutoJournalEntry(
  db: Database,
  companyId: string,
  input: {
    date: Date;
    reference: string;
    description: string;
    sourceType: string;
    sourceId: string;
    /** Analytical dimension applied to every line of this entry (activity/fund). */
    costCenterId?: string | null;
    lines: Array<{
      accountCode: string;
      debit?: string;
      credit?: string;
      description?: string;
    }>;
  },
): Promise<JournalEntry> {
  // Resolve account codes to IDs
  const accountCodes = input.lines.map((l) => l.accountCode);
  const accountRows = await db
    .select({ id: accounts.id, code: accounts.code })
    .from(accounts)
    .where(
      and(
        eq(accounts.companyId, companyId),
        // inArray (not raw `= ANY(...)`) so the code list binds correctly on
        // BOTH drivers — postgres-js (self-hosted/TCP) rejects the raw-ANY
        // array binding; neon accepts it. Auto journal entries must work on
        // every deployment.
        inArray(accounts.code, accountCodes),
      ),
    );

  const codeToId = new Map(accountRows.map((a) => [a.code, a.id]));

  // Validate all codes found
  for (const code of accountCodes) {
    if (!codeToId.has(code)) {
      throw new Error(`Account with code ${code} not found`);
    }
  }

  // Validate debits == credits before inserting
  const balance = validateJournalBalance(input.lines);
  if (!balance.valid) {
    throw new Error(
      `Auto journal entry must balance. Debits: ${balance.totalDebits}, Credits: ${balance.totalCredits} (source: ${input.sourceType} ${input.sourceId})`,
    );
  }

  return postJournalEntry(db, {
    companyId,
    date: input.date,
    reference: input.reference,
    description: input.description,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    lines: input.lines.map((line) => ({
      accountId: codeToId.get(line.accountCode)!,
      costCenterId: input.costCenterId ?? null,
      debit: line.debit || null,
      credit: line.credit || null,
      description: line.description || null,
    })),
  });
}

export async function deleteJournalEntry(
  db: Database,
  companyId: string,
  entryId: string,
): Promise<void> {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.companyId, companyId)));

  if (!entry) throw new Error("Journal entry not found");
  // GeBüV: a POSTED entry is immutable — never deleted, only reversed (Storno).
  // Only true drafts (postedAt IS NULL) may be deleted.
  if (entry.postedAt) {
    throw new DomainError(
      "cannotDeletePosted",
      undefined,
      "A posted journal entry cannot be deleted; reverse it (Storno) instead.",
    );
  }

  // Lines cascade via FK
  await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.companyId, companyId)));
}

/**
 * Reverse a posted journal entry with a Storno counter-entry (swapped debit/
 * credit), dated into the OPEN period. The original is never mutated except for
 * its reversal-link column (not part of the hash). This is the only way to undo
 * a posted entry (GeBüV — A1).
 */
export async function reverseJournalEntry(
  db: Database,
  companyId: string,
  entryId: string,
  opts?: { date?: Date; userId?: string | null },
): Promise<JournalEntry> {
  return db.transaction(async (tx) => {
    const [orig] = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.companyId, companyId)));
    if (!orig) throw new Error("Journal entry not found");
    if (orig.reversedByEntryId) {
      throw new DomainError("alreadyReversed", undefined, "Journal entry already reversed");
    }
    const lines = await tx
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, entryId));

    const reversal = await postEntryTx(tx, {
      companyId,
      date: opts?.date ?? new Date(),
      reference: orig.reference ? `Storno ${orig.reference}` : "Storno",
      description: `Storno: ${orig.description ?? ""}`.trim(),
      sourceType: "reversal",
      sourceId: orig.id,
      createdBy: opts?.userId ?? null,
      actorUserId: opts?.userId ?? null,
      auditAction: "journal.reversed",
      reversesEntryId: orig.id,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        costCenterId: l.costCenterId,
        debit: l.credit ?? null, // swap debit/credit
        credit: l.debit ?? null,
        description: l.description ? `Storno: ${l.description}` : "Storno",
      })),
    });

    // Link original → reversal (metadata only, not hashed).
    await tx
      .update(journalEntries)
      .set({ reversedByEntryId: reversal.id })
      .where(eq(journalEntries.id, orig.id));

    return reversal;
  });
}

/**
 * Recompute and verify a company's posted-entry hash chain end-to-end.
 * Returns ok, or the first broken sequenceNo + reason (tamper/gap detected).
 */
export async function verifyLedgerIntegrity(
  db: Database,
  companyId: string,
): Promise<ChainVerification> {
  const entries = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.companyId, companyId), isNotNull(journalEntries.sequenceNo)))
    .orderBy(asc(journalEntries.sequenceNo));

  const chain: ChainEntry[] = [];
  for (const e of entries) {
    const lines = await db.select().from(journalLines).where(eq(journalLines.journalEntryId, e.id));
    chain.push({
      companyId: e.companyId,
      sequenceNo: e.sequenceNo as number,
      date: e.date,
      reference: e.reference,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      postedAt: e.postedAt as Date,
      prevHash: e.prevHash as string,
      entryHash: e.entryHash as string,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    });
  }
  return verifyChain(chain);
}

/**
 * One-time migration: assign sequenceNo + postedAt + hash chain to a company's
 * existing (pre-A1) journal entries, in (createdAt, id) order, so
 * verifyLedgerIntegrity covers historical data. Safe to re-run — already-chained
 * entries are skipped and only advance the pointers.
 */
export async function backfillLedgerChain(
  db: Database,
  companyId: string,
): Promise<{ processed: number }> {
  return db.transaction(async (tx) => {
    const entries = await tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.companyId, companyId))
      .orderBy(asc(journalEntries.createdAt), asc(journalEntries.id));

    await tx.insert(ledgerHeads).values({ companyId }).onConflictDoNothing();
    const [head] = await tx
      .select()
      .from(ledgerHeads)
      .where(eq(ledgerHeads.companyId, companyId))
      .for("update");

    let seq = head?.lastSequenceNo ?? 0;
    let prevHash = head?.lastHash ?? GENESIS_HASH;
    let processed = 0;

    for (const e of entries) {
      if (e.sequenceNo != null) {
        seq = e.sequenceNo;
        prevHash = e.entryHash ?? prevHash;
        continue;
      }
      const lines = await tx
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, e.id));
      seq += 1;
      const postedAt = e.createdAt;
      const entryHash = computeEntryHash({
        companyId,
        sequenceNo: seq,
        date: e.date,
        reference: e.reference,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        postedAt,
        prevHash,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
        })),
      });
      await tx
        .update(journalEntries)
        .set({ sequenceNo: seq, postedAt, prevHash, entryHash })
        .where(eq(journalEntries.id, e.id));
      prevHash = entryHash;
      processed += 1;
    }

    await tx
      .update(ledgerHeads)
      .set({ lastSequenceNo: seq, lastHash: prevHash, updatedAt: new Date() })
      .where(eq(ledgerHeads.companyId, companyId));

    return { processed };
  });
}

// ============================================================================
// ACCOUNT STATEMENT (Kontoauszug) — per-account ledger with running balance.
// ============================================================================

/** Assets and expenses are debit-normal; liabilities/equity/revenue credit-normal. */
export function isDebitNormalAccount(type: string): boolean {
  return type === "asset" || type === "expense";
}

/** Signed movement of a line on an account, respecting the account's nature. */
export function accountSignedDelta(
  type: string,
  debit: string | null,
  credit: string | null,
): Decimal {
  const d = new Decimal(debit || "0");
  const c = new Decimal(credit || "0");
  return isDebitNormalAccount(type) ? d.minus(c) : c.minus(d);
}

export interface AccountStatementRow {
  entryId: string;
  date: Date;
  reference: string | null;
  description: string | null;
  debit: string | null;
  credit: string | null;
  runningBalance: string;
}

export interface AccountStatement {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: string;
  closingBalance: string;
  rows: AccountStatementRow[];
}

/**
 * Per-account statement (Kontoauszug): opening balance (signed sum before
 * dateFrom), every posting in the period with a running balance, and the
 * closing balance — the "show me all postings to 3400" view a Treuhänder needs.
 */
export async function getAccountStatement(
  db: Database,
  companyId: string,
  params: { accountCode: string; dateFrom: string; dateTo: string },
): Promise<AccountStatement> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.companyId, companyId), eq(accounts.code, params.accountCode)))
    .limit(1);
  if (!account) {
    throw new DomainError("accountNotFound", undefined, "Account not found");
  }

  const fromDate = new Date(params.dateFrom);
  const toDate = new Date(params.dateTo);

  const openingRows = await db
    .select({ debit: journalLines.debit, credit: journalLines.credit })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalEntries.companyId, companyId),
        eq(journalLines.accountId, account.id),
        sql`${journalEntries.date} < ${fromDate}`,
      ),
    );
  let running = openingRows.reduce(
    (acc, r) => acc.plus(accountSignedDelta(account.type, r.debit, r.credit)),
    new Decimal(0),
  );
  const openingBalance = running.toFixed(2);

  const periodRows = await db
    .select({
      entryId: journalEntries.id,
      date: journalEntries.date,
      reference: journalEntries.reference,
      entryDesc: journalEntries.description,
      lineDesc: journalLines.description,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(
      and(
        eq(journalEntries.companyId, companyId),
        eq(journalLines.accountId, account.id),
        between(journalEntries.date, fromDate, toDate),
      ),
    )
    .orderBy(asc(journalEntries.date), asc(journalEntries.sequenceNo));

  const rows: AccountStatementRow[] = periodRows.map((r) => {
    running = running.plus(accountSignedDelta(account.type, r.debit, r.credit));
    return {
      entryId: r.entryId,
      date: r.date,
      reference: r.reference,
      description: r.lineDesc ?? r.entryDesc,
      debit: r.debit,
      credit: r.credit,
      runningBalance: running.toFixed(2),
    };
  });

  return {
    accountCode: account.code,
    accountName: account.name,
    accountType: account.type,
    openingBalance,
    closingBalance: running.toFixed(2),
    rows,
  };
}

// ============================================================================
// TRIAL BALANCE & ACCOUNT BALANCES
// ============================================================================

export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export async function getTrialBalance(
  db: Database,
  companyId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<AccountBalance[]> {
  const dateConditions: ReturnType<typeof sql>[] = [];
  if (dateFrom) {
    dateConditions.push(sql`${journalEntries.date} >= ${new Date(dateFrom)}`);
  }
  if (dateTo) {
    dateConditions.push(sql`${journalEntries.date} <= ${new Date(dateTo)}`);
  }

  const dateFilter = dateConditions.length > 0 ? and(...dateConditions) : undefined;

  const result = await db
    .select({
      accountId: accounts.id,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      totalDebit: sql<number>`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL)), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL)), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(
      journalEntries,
      and(
        eq(journalLines.journalEntryId, journalEntries.id),
        eq(journalEntries.companyId, companyId),
        ...(dateFilter ? [dateFilter] : []),
      ),
    )
    .where(and(eq(accounts.companyId, companyId), eq(accounts.isActive, true)))
    .groupBy(accounts.id, accounts.code, accounts.name, accounts.type)
    .orderBy(asc(accounts.code));

  return result
    .map((r) => ({
      ...r,
      totalDebit: new Decimal(r.totalDebit || "0").toNumber(),
      totalCredit: new Decimal(r.totalCredit || "0").toNumber(),
      balance: new Decimal(r.totalDebit || "0").minus(r.totalCredit || "0").toNumber(),
    }))
    .filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0);
}

// ============================================================================
// FISCAL YEARS & PERIODS
// ============================================================================

export async function listFiscalYears(db: Database, companyId: string): Promise<FiscalYear[]> {
  return db
    .select()
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, companyId))
    .orderBy(desc(fiscalYears.startDate));
}

export async function getFiscalYear(
  db: Database,
  companyId: string,
  yearId: string,
): Promise<(FiscalYear & { periods: FiscalPeriod[] }) | null> {
  const [year] = await db
    .select()
    .from(fiscalYears)
    .where(and(eq(fiscalYears.id, yearId), eq(fiscalYears.companyId, companyId)));

  if (!year) return null;

  const periods = await db
    .select()
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.fiscalYearId, yearId))
    .orderBy(asc(fiscalPeriods.startDate));

  return { ...year, periods };
}

export async function createFiscalYear(
  db: Database,
  companyId: string,
  input: z.infer<typeof createFiscalYearSchema>,
): Promise<FiscalYear> {
  const validated = createFiscalYearSchema.parse(input);

  // Wrap fiscal year + periods insert in transaction
  return db.transaction(async (tx) => {
    const [year] = await tx
      .insert(fiscalYears)
      .values({
        companyId,
        name: validated.name,
        startDate: validated.startDate,
        endDate: validated.endDate,
      })
      .returning();

    // Auto-create 12 monthly periods
    const periods = generateFiscalPeriods(validated.startDate);
    const periodValues = periods.map((p) => ({
      fiscalYearId: year.id,
      ...p,
    }));

    await tx.insert(fiscalPeriods).values(periodValues);

    return year;
  });
}

export async function closeFiscalPeriod(
  db: Database,
  companyId: string,
  periodId: string,
): Promise<FiscalPeriod> {
  // Verify period belongs to company's fiscal year
  const [period] = await db
    .select({
      period: fiscalPeriods,
      year: fiscalYears,
    })
    .from(fiscalPeriods)
    .innerJoin(fiscalYears, eq(fiscalPeriods.fiscalYearId, fiscalYears.id))
    .where(and(eq(fiscalPeriods.id, periodId), eq(fiscalYears.companyId, companyId)));

  if (!period) throw new Error("Period not found");
  if (period.period.isClosed) {
    throw new DomainError("periodAlreadyClosed", undefined, "Period is already closed");
  }

  const [updated] = await db
    .update(fiscalPeriods)
    .set({ isClosed: true })
    .where(eq(fiscalPeriods.id, periodId))
    .returning();

  return updated;
}

/** Swiss KMU account code for annual profit/loss (Jahresgewinn/Jahresverlust) */
const ANNUAL_PROFIT_LOSS_ACCOUNT = "2950";

export async function closeFiscalYear(
  db: Database,
  companyId: string,
  yearId: string,
  userId: string,
): Promise<FiscalYear> {
  const year = await getFiscalYear(db, companyId, yearId);
  if (!year) throw new Error("Fiscal year not found");
  if (year.isClosed) {
    throw new DomainError("fiscalYearAlreadyClosed", undefined, "Fiscal year is already closed");
  }

  return db.transaction(async (tx) => {
    // 1. Get all revenue & expense account balances for this fiscal year
    const plBalances = await tx
      .select({
        accountId: accounts.id,
        code: accounts.code,
        type: accounts.type,
        totalDebit: sql<string>`COALESCE(SUM(CAST(${journalLines.debit} AS DECIMAL)), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(CAST(${journalLines.credit} AS DECIMAL)), 0)`,
      })
      .from(accounts)
      .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
      .innerJoin(
        journalEntries,
        and(
          eq(journalLines.journalEntryId, journalEntries.id),
          eq(journalEntries.companyId, companyId),
          sql`${journalEntries.date} >= ${year.startDate}`,
          sql`${journalEntries.date} <= ${year.endDate}`,
        ),
      )
      .where(
        and(eq(accounts.companyId, companyId), sql`${accounts.type} IN ('revenue', 'expense')`),
      )
      .groupBy(accounts.id, accounts.code, accounts.type);

    // 2. Build closing journal lines — zero out each P&L account
    const closingLines: Array<{
      journalEntryId: string;
      accountId: string;
      debit: string | null;
      credit: string | null;
      description: string | null;
    }> = [];

    let totalProfitLoss = new Decimal(0);

    for (const acct of plBalances) {
      const balance = new Decimal(acct.totalDebit).minus(acct.totalCredit);
      if (balance.isZero()) continue;

      // Revenue accounts have credit balance (credit > debit), so balance is negative
      // To close: debit the revenue account (reduce it to zero)
      // Expense accounts have debit balance (debit > credit), so balance is positive
      // To close: credit the expense account (reduce it to zero)
      if (balance.greaterThan(0)) {
        // Debit balance (expense) → credit to close
        closingLines.push({
          journalEntryId: "", // placeholder, set after entry creation
          accountId: acct.accountId,
          debit: null,
          credit: balance.toFixed(2),
          description: null,
        });
      } else {
        // Credit balance (revenue) → debit to close
        closingLines.push({
          journalEntryId: "", // placeholder
          accountId: acct.accountId,
          debit: balance.abs().toFixed(2),
          credit: null,
          description: null,
        });
      }

      // Net profit/loss: revenue (negative balance) becomes positive profit
      // totalProfitLoss accumulates: negative = profit, positive = loss
      totalProfitLoss = totalProfitLoss.plus(balance);
    }

    // 3. Create closing journal entry if there are P&L balances to close
    if (closingLines.length > 0) {
      // Find the 2950 account (Jahresgewinn/Jahresverlust)
      const [profitLossAccount] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(eq(accounts.companyId, companyId), eq(accounts.code, ANNUAL_PROFIT_LOSS_ACCOUNT)),
        );

      if (!profitLossAccount) {
        throw new Error(
          `Account ${ANNUAL_PROFIT_LOSS_ACCOUNT} (Jahresgewinn/Jahresverlust) not found. Cannot create closing entries.`,
        );
      }

      const [closingEntry] = await tx
        .insert(journalEntries)
        .values({
          companyId,
          date: new Date(year.endDate),
          reference: `CLOSING-${year.name}`,
          description: `Jahresabschluss ${year.name} — Erfolgsrechnung abschliessen`,
          sourceType: "year_end_closing",
          createdBy: userId,
        })
        .returning();

      // Set journalEntryId on all closing lines
      const linesWithEntryId = closingLines.map((l) => ({
        ...l,
        journalEntryId: closingEntry.id,
      }));

      // Add the balancing line to 2950
      // totalProfitLoss is positive for loss, negative for profit
      // If profit (negative totalProfitLoss): credit 2950
      // If loss (positive totalProfitLoss): debit 2950
      if (!totalProfitLoss.isZero()) {
        if (totalProfitLoss.greaterThan(0)) {
          // Loss: debit 2950
          linesWithEntryId.push({
            journalEntryId: closingEntry.id,
            accountId: profitLossAccount.id,
            debit: totalProfitLoss.toFixed(2),
            credit: null,
            description: null,
          });
        } else {
          // Profit: credit 2950
          linesWithEntryId.push({
            journalEntryId: closingEntry.id,
            accountId: profitLossAccount.id,
            debit: null,
            credit: totalProfitLoss.abs().toFixed(2),
            description: null,
          });
        }
      }

      await tx.insert(journalLines).values(linesWithEntryId);
    }

    // 4. Close all open periods
    await tx
      .update(fiscalPeriods)
      .set({ isClosed: true })
      .where(and(eq(fiscalPeriods.fiscalYearId, yearId), eq(fiscalPeriods.isClosed, false)));

    // 5. Mark year as closed
    const [updated] = await tx
      .update(fiscalYears)
      .set({ isClosed: true })
      .where(and(eq(fiscalYears.id, yearId), eq(fiscalYears.companyId, companyId)))
      .returning();

    return updated;
  });
}

// ============================================================================
// TRIAL BALANCE AGGREGATION
// ============================================================================

export interface TrialBalanceTotals {
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
}

/**
 * Aggregate a trial balance result set into summary totals by account type.
 * Pure function — no DB access.
 */
export function calculateTrialBalanceTotals(trialBalance: AccountBalance[]): TrialBalanceTotals {
  return trialBalance.reduce(
    (acc, row) => {
      switch (row.type) {
        case "asset":
          acc.assets += row.balance;
          break;
        case "liability":
          acc.liabilities += Math.abs(row.balance);
          break;
        case "equity":
          acc.equity += Math.abs(row.balance);
          break;
        case "revenue":
          acc.revenue += row.totalCredit - row.totalDebit;
          break;
        case "expense":
          acc.expenses += row.totalDebit - row.totalCredit;
          break;
      }
      return acc;
    },
    { assets: 0, liabilities: 0, equity: 0, revenue: 0, expenses: 0 },
  );
}
