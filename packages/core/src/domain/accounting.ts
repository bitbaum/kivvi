import { z } from 'zod';
import { eq, and, asc, desc, sql, ilike, between } from 'drizzle-orm';
import {
  accounts,
  journalEntries,
  journalLines,
  fiscalYears,
  fiscalPeriods,
} from '@kivvi/database';
import type { Database, Account, JournalEntry, JournalLine, FiscalYear, FiscalPeriod } from '@kivvi/database';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createAccountSchema = z.object({
  code: z.string().min(1, 'Code is required').max(10),
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
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
  date: z.string().min(1, 'Date is required'),
  reference: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  lines: z.array(journalLineSchema).min(2, 'At least 2 lines required'),
});

export const createFiscalYearSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export async function listAccounts(
  db: Database,
  companyId: string,
  filters?: { type?: string; search?: string; isActive?: boolean }
): Promise<Account[]> {
  const conditions = [eq(accounts.companyId, companyId)];

  if (filters?.type) {
    conditions.push(eq(accounts.type, filters.type as any));
  }
  if (filters?.search) {
    conditions.push(
      sql`(${accounts.code} ILIKE ${`%${filters.search}%`} OR ${accounts.name} ILIKE ${`%${filters.search}%`})`
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
  accountId: string
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
  input: z.infer<typeof createAccountSchema>
): Promise<Account> {
  const validated = createAccountSchema.parse(input);

  // Check for duplicate code
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.companyId, companyId), eq(accounts.code, validated.code)));
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
  input: z.infer<typeof updateAccountSchema>
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
          sql`${accounts.id} != ${accountId}`
        )
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

  if (!account) throw new Error('Account not found');
  return account;
}

export async function toggleAccount(
  db: Database,
  companyId: string,
  accountId: string
): Promise<Account> {
  const account = await getAccount(db, companyId, accountId);
  if (!account) throw new Error('Account not found');

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
  companyId: string
): Promise<number> {
  // Dynamic import to avoid bundling seed data unless needed
  const { SWISS_KMU_ACCOUNTS } = await import('@kivvi/database/src/seeds/swiss-kmu-kontenrahmen');

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
  filters?: JournalEntryFilters
): Promise<{ data: JournalEntry[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 25;

  const conditions = [eq(journalEntries.companyId, companyId)];

  if (filters?.dateFrom && filters?.dateTo) {
    conditions.push(
      between(journalEntries.date, new Date(filters.dateFrom), new Date(filters.dateTo))
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
      sql`(${journalEntries.reference} ILIKE ${`%${filters.search}%`} OR ${journalEntries.description} ILIKE ${`%${filters.search}%`})`
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
  entryId: string
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
  input: z.infer<typeof createJournalEntrySchema>
): Promise<JournalEntry> {
  const validated = createJournalEntrySchema.parse(input);

  // Validate debits = credits
  const totalDebits = validated.lines.reduce(
    (sum, l) => sum + (parseFloat(l.debit || '0') || 0),
    0
  );
  const totalCredits = validated.lines.reduce(
    (sum, l) => sum + (parseFloat(l.credit || '0') || 0),
    0
  );

  if (Math.abs(totalDebits - totalCredits) > 0.005) {
    throw new Error(
      `Journal entry must balance. Debits: ${totalDebits.toFixed(2)}, Credits: ${totalCredits.toFixed(2)}`
    );
  }

  const [entry] = await db
    .insert(journalEntries)
    .values({
      companyId,
      date: new Date(validated.date),
      reference: validated.reference || null,
      description: validated.description,
      sourceType: 'manual',
      createdBy: userId,
    })
    .returning();

  // Insert lines
  await db.insert(journalLines).values(
    validated.lines.map((line) => ({
      journalEntryId: entry.id,
      accountId: line.accountId,
      debit: line.debit || null,
      credit: line.credit || null,
      description: line.description || null,
    }))
  );

  return entry;
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
    lines: Array<{ accountCode: string; debit?: string; credit?: string; description?: string }>;
  }
): Promise<JournalEntry> {
  // Resolve account codes to IDs
  const accountCodes = input.lines.map((l) => l.accountCode);
  const accountRows = await db
    .select({ id: accounts.id, code: accounts.code })
    .from(accounts)
    .where(and(eq(accounts.companyId, companyId), sql`${accounts.code} = ANY(${accountCodes})`));

  const codeToId = new Map(accountRows.map((a) => [a.code, a.id]));

  // Validate all codes found
  for (const code of accountCodes) {
    if (!codeToId.has(code)) {
      throw new Error(`Account with code ${code} not found`);
    }
  }

  const [entry] = await db
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

  await db.insert(journalLines).values(
    input.lines.map((line) => ({
      journalEntryId: entry.id,
      accountId: codeToId.get(line.accountCode)!,
      debit: line.debit || null,
      credit: line.credit || null,
      description: line.description || null,
    }))
  );

  return entry;
}

export async function deleteJournalEntry(
  db: Database,
  companyId: string,
  entryId: string
): Promise<void> {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.companyId, companyId)));

  if (!entry) throw new Error('Journal entry not found');
  if (entry.sourceType !== 'manual') {
    throw new Error('Only manual journal entries can be deleted');
  }

  // Lines cascade via FK
  await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.companyId, companyId)));
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
  dateTo?: string
): Promise<AccountBalance[]> {
  const dateConditions: any[] = [];
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
        ...(dateFilter ? [dateFilter] : [])
      )
    )
    .where(and(eq(accounts.companyId, companyId), eq(accounts.isActive, true)))
    .groupBy(accounts.id, accounts.code, accounts.name, accounts.type)
    .orderBy(asc(accounts.code));

  return result
    .map((r) => ({
      ...r,
      totalDebit: Number(r.totalDebit),
      totalCredit: Number(r.totalCredit),
      balance: Number(r.totalDebit) - Number(r.totalCredit),
    }))
    .filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0);
}

// ============================================================================
// FISCAL YEARS & PERIODS
// ============================================================================

export async function listFiscalYears(
  db: Database,
  companyId: string
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
  yearId: string
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
  input: z.infer<typeof createFiscalYearSchema>
): Promise<FiscalYear> {
  const validated = createFiscalYearSchema.parse(input);

  const [year] = await db
    .insert(fiscalYears)
    .values({
      companyId,
      name: validated.name,
      startDate: validated.startDate,
      endDate: validated.endDate,
    })
    .returning();

  // Auto-create 12 monthly periods
  const start = new Date(validated.startDate);
  const periodValues: Array<{ fiscalYearId: string; name: string; startDate: string; endDate: string }> = [];

  for (let i = 0; i < 12; i++) {
    const periodStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const periodEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);

    const monthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
    ];

    periodValues.push({
      fiscalYearId: year.id,
      name: `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`,
      startDate: periodStart.toISOString().split('T')[0],
      endDate: periodEnd.toISOString().split('T')[0],
    });
  }

  await db.insert(fiscalPeriods).values(periodValues);

  return year;
}

export async function closeFiscalPeriod(
  db: Database,
  companyId: string,
  periodId: string
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

  if (!period) throw new Error('Period not found');
  if (period.period.isClosed) throw new Error('Period is already closed');

  const [updated] = await db
    .update(fiscalPeriods)
    .set({ isClosed: true })
    .where(eq(fiscalPeriods.id, periodId))
    .returning();

  return updated;
}

export async function closeFiscalYear(
  db: Database,
  companyId: string,
  yearId: string
): Promise<FiscalYear> {
  const year = await getFiscalYear(db, companyId, yearId);
  if (!year) throw new Error('Fiscal year not found');
  if (year.isClosed) throw new Error('Fiscal year is already closed');

  // Close all open periods
  await db
    .update(fiscalPeriods)
    .set({ isClosed: true })
    .where(and(eq(fiscalPeriods.fiscalYearId, yearId), eq(fiscalPeriods.isClosed, false)));

  const [updated] = await db
    .update(fiscalYears)
    .set({ isClosed: true })
    .where(and(eq(fiscalYears.id, yearId), eq(fiscalYears.companyId, companyId)))
    .returning();

  return updated;
}
