import { type Page, type Locator, expect } from "@playwright/test";
import { createNeonClient } from "@kivvi/database";
import {
  accounts,
  apiTokens,
  bankAccounts,
  bankTransactions,
  companies,
  contacts,
  documentPayments,
  documents,
  documentItems,
  fiscalPeriods,
  fiscalYears,
  inventoryItems,
  invitations,
  journalEntries,
  journalLines,
  manufacturers,
  memberships,
  numberSequences,
  priceLists,
  priceRules,
  productGroups,
  products,
  projects,
  recurringInvoiceConfigs,
  repairParts,
  serialNumbers,
  stockLevels,
  stockMovements,
  users,
  warehouses,
  webhookDeliveries,
  webhookEndpoints,
} from "@kivvi/database";
import { eq, like, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_PASSWORD = "TestPassword123!";
const DB_URL = process.env.DATABASE_URL!;

export interface TestData {
  companyId: string;
  userId: string;
  email: string;
  password: string;
}

// Minimal number sequences needed for E2E tests
const SEQUENCES = [
  { type: "contact", prefix: "K" },
  { type: "invoice", prefix: "RE" },
  { type: "quote", prefix: "AN" },
  { type: "order", prefix: "AU" },
  { type: "credit_note", prefix: "GU" },
  { type: "delivery_note", prefix: "LS" },
  { type: "dunning", prefix: "MA" },
  { type: "purchase_order", prefix: "BE" },
  { type: "purchase_invoice", prefix: "ER" },
  { type: "product", prefix: "ART" },
  { type: "order_confirmation", prefix: "AB" },
];

// Use Neon HTTP driver — stateless, no connection pool leaks
function getDb() {
  return createNeonClient(DB_URL);
}

// ---------------------------------------------------------------------------
// Cleanup helper — deletes all data for a company in FK-safe order
// ---------------------------------------------------------------------------

async function deleteCompanyData(
  db: ReturnType<typeof getDb>,
  companyId: string,
) {
  const endpoints = await db
    .select({ id: webhookEndpoints.id })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.companyId, companyId));
  if (endpoints.length > 0) {
    await db.delete(webhookDeliveries).where(
      inArray(
        webhookDeliveries.endpointId,
        endpoints.map((e) => e.id),
      ),
    );
  }
  await db
    .delete(webhookEndpoints)
    .where(eq(webhookEndpoints.companyId, companyId));
  await db.delete(apiTokens).where(eq(apiTokens.companyId, companyId));
  await db.delete(invitations).where(eq(invitations.companyId, companyId));
  await db.delete(memberships).where(eq(memberships.companyId, companyId));

  const years = await db
    .select({ id: fiscalYears.id })
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, companyId));
  if (years.length > 0) {
    await db.delete(fiscalPeriods).where(
      inArray(
        fiscalPeriods.fiscalYearId,
        years.map((y) => y.id),
      ),
    );
  }
  await db.delete(fiscalYears).where(eq(fiscalYears.companyId, companyId));

  const entries = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(eq(journalEntries.companyId, companyId));
  if (entries.length > 0) {
    await db.delete(journalLines).where(
      inArray(
        journalLines.journalEntryId,
        entries.map((e) => e.id),
      ),
    );
  }
  await db
    .delete(journalEntries)
    .where(eq(journalEntries.companyId, companyId));

  // Get all document IDs to delete their items first
  const docs = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.companyId, companyId));

  if (docs.length > 0) {
    await db.delete(documentPayments).where(
      inArray(
        documentPayments.documentId,
        docs.map((d) => d.id),
      ),
    );
    await db.delete(documentItems).where(
      inArray(
        documentItems.documentId,
        docs.map((d) => d.id),
      ),
    );
  }

  const bankAccountsForCompany = await db
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(eq(bankAccounts.companyId, companyId));
  if (bankAccountsForCompany.length > 0) {
    await db.delete(bankTransactions).where(
      inArray(
        bankTransactions.bankAccountId,
        bankAccountsForCompany.map((b) => b.id),
      ),
    );
  }
  await db.delete(bankAccounts).where(eq(bankAccounts.companyId, companyId));

  await db
    .delete(recurringInvoiceConfigs)
    .where(eq(recurringInvoiceConfigs.companyId, companyId));

  const productsForCompany = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.companyId, companyId));
  if (productsForCompany.length > 0) {
    await db.delete(stockMovements).where(
      inArray(
        stockMovements.productId,
        productsForCompany.map((p) => p.id),
      ),
    );
  }

  await db.delete(repairParts).where(eq(repairParts.companyId, companyId));
  await db
    .delete(inventoryItems)
    .where(eq(inventoryItems.companyId, companyId));
  await db.delete(documents).where(eq(documents.companyId, companyId));

  const priceListsForCompany = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(eq(priceLists.companyId, companyId));
  if (priceListsForCompany.length > 0) {
    await db.delete(priceRules).where(
      inArray(
        priceRules.priceListId,
        priceListsForCompany.map((p) => p.id),
      ),
    );
  }
  await db.delete(priceLists).where(eq(priceLists.companyId, companyId));

  if (productsForCompany.length > 0) {
    await db.delete(stockLevels).where(
      inArray(
        stockLevels.productId,
        productsForCompany.map((p) => p.id),
      ),
    );
    await db.delete(serialNumbers).where(
      inArray(
        serialNumbers.productId,
        productsForCompany.map((p) => p.id),
      ),
    );
  }

  await db.delete(products).where(eq(products.companyId, companyId));
  await db.delete(productGroups).where(eq(productGroups.companyId, companyId));
  await db.delete(manufacturers).where(eq(manufacturers.companyId, companyId));
  await db.delete(warehouses).where(eq(warehouses.companyId, companyId));
  await db.delete(projects).where(eq(projects.companyId, companyId));
  await db.delete(accounts).where(eq(accounts.companyId, companyId));

  await db.delete(contacts).where(eq(contacts.companyId, companyId));
  await db
    .delete(numberSequences)
    .where(eq(numberSequences.companyId, companyId));
  await db.delete(users).where(eq(users.companyId, companyId));
  await db.delete(companies).where(eq(companies.id, companyId));
}

// ---------------------------------------------------------------------------
// Retry helper — Neon free tier has limited connection slots
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 10_000,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isConnectionError =
        error instanceof Error && error.message?.includes("connection slots");
      if (!isConnectionError || attempt === retries) throw error;
      console.log(
        `DB connection error, retrying in ${delay}ms (attempt ${attempt}/${retries})...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export async function seed(): Promise<TestData> {
  return withRetry(async () => {
    const db = getDb();

    // Clean up stale test data from previous runs
    const staleUsers = await db
      .select({ id: users.id, companyId: users.companyId })
      .from(users)
      .where(like(users.email, "e2e-%@kivvi.test"));

    for (const u of staleUsers) {
      if (u.companyId) {
        await deleteCompanyData(db, u.companyId);
      } else {
        await db.delete(users).where(eq(users.id, u.id));
      }
    }

    const ts = Date.now();
    const email = `e2e-${ts}@kivvi.test`;
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    // 1. Create company with onboarding already completed
    const [company] = await db
      .insert(companies)
      .values({
        name: `E2E Test ${ts}`,
        currency: "CHF",
        country: "CH",
        settings: {
          defaultVatRate: 8.1,
          defaultPaymentTermsDays: 30,
          onboardingCompletedAt: new Date().toISOString(),
          onboardingStep: 4,
        },
      })
      .returning({ id: companies.id });

    // 2. Create user
    const [user] = await db
      .insert(users)
      .values({
        email,
        name: "E2E Tester",
        passwordHash,
        companyId: company.id,
        role: "admin",
      })
      .returning({ id: users.id });

    // 3. Seed number sequences (needed for contact/invoice creation)
    await db.insert(numberSequences).values(
      SEQUENCES.map((s) => ({
        companyId: company.id,
        type: s.type,
        prefix: s.prefix,
      })),
    );

    return {
      companyId: company.id,
      userId: user.id,
      email,
      password: TEST_PASSWORD,
    };
  }); // end withRetry
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function cleanup(data: TestData): Promise<void> {
  const db = getDb();
  await deleteCompanyData(db, data.companyId);
}

// ---------------------------------------------------------------------------
// Page helpers — shared patterns for E2E specs
// ---------------------------------------------------------------------------

/**
 * Click a submit button and wait for navigation, retrying once if hydration
 * wasn't complete on the first click (common in dev mode).
 */
export async function submitAndWaitForUrl(
  page: Page,
  button: Locator,
  urlPattern: RegExp,
  timeout = 45_000,
): Promise<void> {
  await button.click();
  try {
    await expect(page).toHaveURL(urlPattern, { timeout });
  } catch {
    // Hydration may not have completed on first click — retry
    await button.click();
    await expect(page).toHaveURL(urlPattern, { timeout });
  }
}

/**
 * Handle intermittent error boundary in dev mode — reload once if visible.
 */
export async function dismissErrorBoundary(page: Page): Promise<void> {
  const errorHeading = page.getByRole("heading", {
    name: "Something went wrong",
  });
  if (await errorHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.reload();
    await page.waitForLoadState("networkidle");
  }
}
