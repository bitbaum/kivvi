import { z } from "zod";
import Decimal from "decimal.js";
import { eq, and, asc, desc, sql, ilike, between } from "drizzle-orm";
import {
  accounts,
  journalEntries,
  journalLines,
  fiscalYears,
  fiscalPeriods,
} from "@kivvi/database";
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
    .where(
      and(eq(accounts.companyId, companyId), eq(accounts.code, validated.code)),
    );
  if (existing) {
    throw new Error(`Account with code ${validated.code} already exists`);
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
      throw new Error(`Account with code ${validated.code} already exists`);
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
export async function seedChartOfAccounts(
  db: Database,
  companyId: string,
): Promise<number> {
  // Dynamic import to avoid bundling seed data unless needed
  const { SWISS_KMU_ACCOUNTS } =
    await import("@kivvi/database/src/seeds/swiss-kmu-kontenrahmen");

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

  const periods: Array<{ name: string; startDate: string; endDate: string }> =
    [];

  // Format as YYYY-MM-DD using local date parts (not UTC — toISOString shifts dates in CET)
  const fmtDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  for (let i = 0; i < 12; i++) {
    const periodStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const periodEnd = new Date(
      start.getFullYear(),
      start.getMonth() + i + 1,
      0,
    );

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
      between(
        journalEntries.date,
        new Date(filters.dateFrom),
        new Date(filters.dateTo),
      ),
    );
  } else if (filters?.dateFrom) {
    conditions.push(
      sql`${journalEntries.date} >= ${new Date(filters.dateFrom)}`,
    );
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
    .where(
      and(
        eq(journalEntries.id, entryId),
        eq(journalEntries.companyId, companyId),
      ),
    );

  if (!entry) return null;

  const lines = await db
    .select({
      id: journalLines.id,
      journalEntryId: journalLines.journalEntryId,
      accountId: journalLines.accountId,
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
      debit: l.debit,
      credit: l.credit,
      description: l.description,
      account: l.account || undefined,
    })),
  };
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
    throw new Error(
      `Journal entry must balance. Debits: ${balance.totalDebits}, Credits: ${balance.totalCredits}`,
    );
  }

  // Wrap journal entry + lines insert in transaction
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        companyId,
        date: new Date(validated.date),
        reference: validated.reference || null,
        description: validated.description,
        sourceType: "manual",
        createdBy: userId,
      })
      .returning();

    // Insert lines
    await tx.insert(journalLines).values(
      validated.lines.map((line) => ({
        journalEntryId: entry.id,
        accountId: line.accountId,
        debit: line.debit || null,
        credit: line.credit || null,
        description: line.description || null,
      })),
    );

    return entry;
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
        sql`${accounts.code} = ANY(${accountCodes})`,
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

  // Wrap journal entry + lines insert in transaction
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        companyId,
        date: input.date,
        reference: input.reference,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      })
      .returning();

    await tx.insert(journalLines).values(
      input.lines.map((line) => ({
        journalEntryId: entry.id,
        accountId: codeToId.get(line.accountCode)!,
        debit: line.debit || null,
        credit: line.credit || null,
        description: line.description || null,
      })),
    );

    return entry;
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
    .where(
      and(
        eq(journalEntries.id, entryId),
        eq(journalEntries.companyId, companyId),
      ),
    );

  if (!entry) throw new Error("Journal entry not found");
  if (entry.sourceType !== "manual") {
    throw new Error("Only manual journal entries can be deleted");
  }

  // Lines cascade via FK
  await db
    .delete(journalEntries)
    .where(
      and(
        eq(journalEntries.id, entryId),
        eq(journalEntries.companyId, companyId),
      ),
    );
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

  const dateFilter =
    dateConditions.length > 0 ? and(...dateConditions) : undefined;

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
      balance: new Decimal(r.totalDebit || "0")
        .minus(r.totalCredit || "0")
        .toNumber(),
    }))
    .filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0);
}

// ============================================================================
// FISCAL YEARS & PERIODS
// ============================================================================

export async function listFiscalYears(
  db: Database,
  companyId: string,
): Promise<FiscalYear[]> {
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
    .where(
      and(eq(fiscalYears.id, yearId), eq(fiscalYears.companyId, companyId)),
    );

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
    .where(
      and(eq(fiscalPeriods.id, periodId), eq(fiscalYears.companyId, companyId)),
    );

  if (!period) throw new Error("Period not found");
  if (period.period.isClosed) throw new Error("Period is already closed");

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
  if (year.isClosed) throw new Error("Fiscal year is already closed");

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
        and(
          eq(accounts.companyId, companyId),
          sql`${accounts.type} IN ('revenue', 'expense')`,
        ),
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
          and(
            eq(accounts.companyId, companyId),
            eq(accounts.code, ANNUAL_PROFIT_LOSS_ACCOUNT),
          ),
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
      .where(
        and(
          eq(fiscalPeriods.fiscalYearId, yearId),
          eq(fiscalPeriods.isClosed, false),
        ),
      );

    // 5. Mark year as closed
    const [updated] = await tx
      .update(fiscalYears)
      .set({ isClosed: true })
      .where(
        and(eq(fiscalYears.id, yearId), eq(fiscalYears.companyId, companyId)),
      )
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
export function calculateTrialBalanceTotals(
  trialBalance: AccountBalance[],
): TrialBalanceTotals {
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
