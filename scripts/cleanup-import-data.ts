#!/usr/bin/env tsx
/**
 * Post-Import Data Cleanup Script
 *
 * Fixes duplicates and broken data created during Kivitendo CSV import.
 * Designed to be idempotent — safe to run multiple times.
 *
 * Usage:
 *   COMPANY_ID=<uuid> pnpm tsx scripts/cleanup-import-data.ts
 *   COMPANY_ID=<uuid> pnpm tsx scripts/cleanup-import-data.ts --dry-run
 *
 * Requires:
 *   - COMPANY_ID env var (uuid of target company)
 *   - DATABASE_URL env var (or .env.local in project root)
 *
 * Steps:
 *   A1. Deduplicate products (same companyId + articleNumber)
 *   A2. Remove orphan invoices (no contact, RE-2026% number)
 *   A3. Fix invoice line items (zero unit prices)
 *   A4. Deduplicate warehouses (same name per company)
 *   A5. Fix stock levels (sync products.stockQuantity from stock_levels)
 *   A6. Update number sequences
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import Papa from 'papaparse';
import Decimal from 'decimal.js';
import { eq, and, sql, inArray, ne, lt, desc, count } from 'drizzle-orm';
import {
  createDb,
  createPostgresClient,
  documents,
  documentItems,
  products,
  stockLevels,
  stockMovements,
  warehouses,
  users,
} from '@kivvi/database';
import type { Database } from '@kivvi/database';
import {
  bulkInsertStockLevels,
  buildProductLookup,
  updateSequencesAfterImport,
} from '@kivvi/core/src/domain/import-bulk';
import {
  KIVITENDO_STOCK_PROFILE,
  stripBom,
  applyMapping,
} from '@kivvi/core/src/domain/import-mappings';

// ============================================================================
// CONFIG
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ROOT = resolve(__dirname, '..');
const STOCK_CSV_PATH = join(PROJECT_ROOT, 'kivitendo-export', 'lagerbestand_warehouse_stock.csv');

// ============================================================================
// HELPERS
// ============================================================================

/** Load .env.local if DATABASE_URL is not set */
function loadEnv(): void {
  if (process.env.DATABASE_URL) return;

  const envPath = resolve(PROJECT_ROOT, '.env.local');
  if (!existsSync(envPath)) {
    console.error('DATABASE_URL not set and no .env.local found');
    process.exit(1);
  }

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ============================================================================
// STEP A1: Deduplicate Products
// ============================================================================

interface StepResult {
  found: number;
  fixed: number;
  errors: string[];
}

async function deduplicateProducts(db: Database, companyId: string): Promise<StepResult> {
  console.log('Step A1: Deduplicate Products');
  const errors: string[] = [];

  // Find duplicate (companyId, articleNumber) groups where articleNumber is not null
  const dupes = await db.execute<{
    article_number: string;
    cnt: string;
  }>(sql`
    SELECT article_number, COUNT(*) as cnt
    FROM products
    WHERE company_id = ${companyId}
      AND article_number IS NOT NULL
    GROUP BY article_number
    HAVING COUNT(*) > 1
  `);

  const dupeRows = dupes.rows ?? dupes;
  const found = Array.isArray(dupeRows) ? dupeRows.length : 0;
  console.log(`   Found ${found} article numbers with duplicates`);

  if (found === 0 || DRY_RUN) {
    if (DRY_RUN && found > 0) {
      console.log(`   (dry-run) Would deduplicate ${found} article numbers`);
    }
    return { found, fixed: DRY_RUN ? 0 : found, errors };
  }

  let fixed = 0;
  for (const row of dupeRows as Array<{ article_number: string; cnt: string }>) {
    const articleNumber = row.article_number;
    try {
      // Get all products with this articleNumber, ordered by createdAt ASC (keep earliest)
      const dupeProducts = await db
        .select({ id: products.id, createdAt: products.createdAt })
        .from(products)
        .where(and(
          eq(products.companyId, companyId),
          eq(products.articleNumber, articleNumber),
        ))
        .orderBy(products.createdAt);

      if (dupeProducts.length <= 1) continue;

      const keepId = dupeProducts[0].id;
      const deleteIds = dupeProducts.slice(1).map((p) => p.id);

      // Re-point foreign keys to the kept product
      await db
        .update(documentItems)
        .set({ productId: keepId })
        .where(inArray(documentItems.productId, deleteIds));

      await db
        .update(stockLevels)
        .set({ productId: keepId })
        .where(inArray(stockLevels.productId, deleteIds));

      await db
        .update(stockMovements)
        .set({ productId: keepId })
        .where(inArray(stockMovements.productId, deleteIds));

      // Delete duplicate products
      await db
        .delete(products)
        .where(inArray(products.id, deleteIds));

      fixed++;
    } catch (err) {
      errors.push(`Article ${articleNumber}: ${(err as Error).message}`);
    }
  }

  console.log(`   Deduplicated ${fixed} article numbers (removed ${found > 0 ? 'duplicates' : '0'} extra rows)`);
  return { found, fixed, errors };
}

// ============================================================================
// STEP A2: Remove Orphan Invoices
// ============================================================================

async function removeOrphanInvoices(db: Database, companyId: string): Promise<StepResult> {
  console.log('Step A2: Remove Orphan Invoices');
  const errors: string[] = [];

  // Find invoices with no contact and number matching RE-2026%
  const orphans = await db
    .select({ id: documents.id, number: documents.number })
    .from(documents)
    .where(and(
      eq(documents.companyId, companyId),
      eq(documents.type, 'invoice'),
      sql`${documents.contactId} IS NULL`,
      sql`${documents.number} LIKE 'RE-2026%'`,
    ));

  const found = orphans.length;
  console.log(`   Found ${found} orphan invoices (type=invoice, no contact, RE-2026%)`);

  if (found === 0 || DRY_RUN) {
    if (DRY_RUN && found > 0) {
      console.log(`   (dry-run) Would delete ${found} orphan invoices and their line items`);
    }
    return { found, fixed: DRY_RUN ? 0 : found, errors };
  }

  let fixed = 0;
  for (const orphan of orphans) {
    try {
      // Delete line items first (FK cascade should handle this, but be explicit)
      await db
        .delete(documentItems)
        .where(eq(documentItems.documentId, orphan.id));

      // Delete the orphan invoice
      await db
        .delete(documents)
        .where(eq(documents.id, orphan.id));

      fixed++;
    } catch (err) {
      errors.push(`Invoice ${orphan.number}: ${(err as Error).message}`);
    }
  }

  console.log(`   Deleted ${fixed} orphan invoices`);
  return { found, fixed, errors };
}

// ============================================================================
// STEP A3: Fix Invoice Line Items
// ============================================================================

async function fixInvoiceLineItems(db: Database, companyId: string): Promise<StepResult> {
  console.log('Step A3: Fix Invoice Line Items (zero unit prices)');
  const errors: string[] = [];

  // Find documents where total > 0 but ALL line items have unitPrice = '0'
  const brokenDocs = await db.execute<{
    id: string;
    number: string;
    total: string;
    item_count: string;
    zero_price_count: string;
  }>(sql`
    SELECT
      d.id,
      d.number,
      d.total,
      COUNT(di.id) as item_count,
      COUNT(CASE WHEN di.unit_price::numeric = 0 THEN 1 END) as zero_price_count
    FROM documents d
    JOIN document_items di ON di.document_id = d.id
    WHERE d.company_id = ${companyId}
      AND d.total::numeric > 0
    GROUP BY d.id, d.number, d.total
    HAVING COUNT(di.id) = COUNT(CASE WHEN di.unit_price::numeric = 0 THEN 1 END)
  `);

  const brokenRows = brokenDocs.rows ?? brokenDocs;
  const found = Array.isArray(brokenRows) ? brokenRows.length : 0;
  console.log(`   Found ${found} documents with total > 0 but all items at unitPrice=0`);

  if (found === 0 || DRY_RUN) {
    if (DRY_RUN && found > 0) {
      console.log(`   (dry-run) Would fix line items on ${found} documents`);
    }
    return { found, fixed: DRY_RUN ? 0 : found, errors };
  }

  // Build a product price lookup: productId -> unitPrice
  const allProducts = await db
    .select({ id: products.id, unitPrice: products.unitPrice })
    .from(products)
    .where(eq(products.companyId, companyId));

  const productPriceMap = new Map<string, string>();
  for (const p of allProducts) {
    if (p.unitPrice && new Decimal(p.unitPrice).gt(0)) {
      productPriceMap.set(p.id, p.unitPrice);
    }
  }

  let fixed = 0;
  for (const doc of brokenRows as Array<{ id: string; number: string; total: string; item_count: string; zero_price_count: string }>) {
    try {
      const docTotal = new Decimal(doc.total);
      const itemCount = parseInt(doc.item_count, 10);

      // Get line items for this document
      const items = await db
        .select({
          id: documentItems.id,
          productId: documentItems.productId,
          quantity: documentItems.quantity,
          unitPrice: documentItems.unitPrice,
        })
        .from(documentItems)
        .where(eq(documentItems.documentId, doc.id))
        .orderBy(documentItems.position);

      if (items.length === 0) continue;

      if (items.length === 1) {
        // Single line item: unitPrice = document.total / quantity
        const item = items[0];
        const qty = new Decimal(item.quantity || '1');
        if (qty.gt(0)) {
          const unitPrice = docTotal.div(qty).toDecimalPlaces(2).toString();
          const lineTotal = qty.times(new Decimal(unitPrice)).toDecimalPlaces(2).toString();

          await db
            .update(documentItems)
            .set({ unitPrice, total: lineTotal })
            .where(eq(documentItems.id, item.id));
        }
      } else {
        // Multiple line items: try product price lookup first
        let resolvedTotal = new Decimal(0);
        let unresolvedItems: Array<{ id: string; quantity: string }> = [];

        for (const item of items) {
          if (item.productId && productPriceMap.has(item.productId)) {
            // Use product's catalog price
            const catalogPrice = productPriceMap.get(item.productId)!;
            const qty = new Decimal(item.quantity || '1');
            const lineTotal = qty.times(new Decimal(catalogPrice)).toDecimalPlaces(2).toString();

            await db
              .update(documentItems)
              .set({ unitPrice: catalogPrice, total: lineTotal })
              .where(eq(documentItems.id, item.id));

            resolvedTotal = resolvedTotal.plus(new Decimal(lineTotal));
          } else {
            unresolvedItems.push({ id: item.id, quantity: item.quantity });
          }
        }

        // Distribute remaining total proportionally across unresolved items
        if (unresolvedItems.length > 0) {
          const remaining = docTotal.minus(resolvedTotal);
          if (remaining.gt(0)) {
            // Calculate total quantity of unresolved items for proportional distribution
            const totalUnresolvedQty = unresolvedItems.reduce(
              (sum, item) => sum.plus(new Decimal(item.quantity || '1')),
              new Decimal(0),
            );

            if (totalUnresolvedQty.gt(0)) {
              let distributedSoFar = new Decimal(0);
              for (let i = 0; i < unresolvedItems.length; i++) {
                const item = unresolvedItems[i];
                const qty = new Decimal(item.quantity || '1');

                let lineTotal: Decimal;
                if (i === unresolvedItems.length - 1) {
                  // Last item gets the remainder to avoid rounding errors
                  lineTotal = remaining.minus(distributedSoFar);
                } else {
                  lineTotal = remaining.times(qty).div(totalUnresolvedQty).toDecimalPlaces(2);
                }
                distributedSoFar = distributedSoFar.plus(lineTotal);

                const unitPrice = qty.gt(0)
                  ? lineTotal.div(qty).toDecimalPlaces(2).toString()
                  : '0';

                await db
                  .update(documentItems)
                  .set({ unitPrice, total: lineTotal.toDecimalPlaces(2).toString() })
                  .where(eq(documentItems.id, item.id));
              }
            }
          }
        }
      }

      fixed++;
    } catch (err) {
      errors.push(`Document ${doc.number}: ${(err as Error).message}`);
    }
  }

  console.log(`   Fixed line items on ${fixed} documents`);
  return { found, fixed, errors };
}

// ============================================================================
// STEP A4: Deduplicate Warehouses
// ============================================================================

async function deduplicateWarehouses(db: Database, companyId: string): Promise<StepResult> {
  console.log('Step A4: Deduplicate Warehouses');
  const errors: string[] = [];

  // Find duplicate warehouse names per company
  const dupes = await db.execute<{
    name: string;
    cnt: string;
  }>(sql`
    SELECT name, COUNT(*) as cnt
    FROM warehouses
    WHERE company_id = ${companyId}
    GROUP BY name
    HAVING COUNT(*) > 1
  `);

  const dupeRows = dupes.rows ?? dupes;
  const found = Array.isArray(dupeRows) ? dupeRows.length : 0;
  console.log(`   Found ${found} warehouse names with duplicates`);

  if (found === 0 || DRY_RUN) {
    if (DRY_RUN && found > 0) {
      console.log(`   (dry-run) Would deduplicate ${found} warehouse names`);
    }
    return { found, fixed: DRY_RUN ? 0 : found, errors };
  }

  let fixed = 0;
  for (const row of dupeRows as Array<{ name: string; cnt: string }>) {
    const warehouseName = row.name;
    try {
      // Get all warehouses with this name, prefer isDefault=true, then earliest ID
      const dupeWarehouses = await db
        .select({ id: warehouses.id, isDefault: warehouses.isDefault })
        .from(warehouses)
        .where(and(
          eq(warehouses.companyId, companyId),
          eq(warehouses.name, warehouseName),
        ));

      if (dupeWarehouses.length <= 1) continue;

      // Keep the default one, or the first one if no default
      const defaultOne = dupeWarehouses.find((w) => w.isDefault);
      const keepId = defaultOne ? defaultOne.id : dupeWarehouses[0].id;
      const deleteIds = dupeWarehouses.filter((w) => w.id !== keepId).map((w) => w.id);

      // Re-point foreign keys to the kept warehouse
      await db
        .update(stockLevels)
        .set({ warehouseId: keepId })
        .where(inArray(stockLevels.warehouseId, deleteIds));

      await db
        .update(stockMovements)
        .set({ warehouseId: keepId })
        .where(inArray(stockMovements.warehouseId, deleteIds));

      // Delete duplicate warehouses
      await db
        .delete(warehouses)
        .where(inArray(warehouses.id, deleteIds));

      fixed++;
    } catch (err) {
      errors.push(`Warehouse "${warehouseName}": ${(err as Error).message}`);
    }
  }

  console.log(`   Deduplicated ${fixed} warehouse names`);
  return { found, fixed, errors };
}

// ============================================================================
// STEP A5: Fix Stock Levels
// ============================================================================

async function fixStockLevels(db: Database, companyId: string): Promise<StepResult> {
  console.log('Step A5: Fix Stock Levels');
  const errors: string[] = [];

  // Check if there are any stock_levels for products in this company
  const stockCount = await db.execute<{ cnt: string }>(sql`
    SELECT COUNT(*) as cnt
    FROM stock_levels sl
    JOIN products p ON p.id = sl.product_id
    WHERE p.company_id = ${companyId}
  `);

  const stockRows = stockCount.rows ?? stockCount;
  const existingCount = parseInt((stockRows as Array<{ cnt: string }>)[0]?.cnt || '0', 10);
  console.log(`   Existing stock_levels records: ${existingCount}`);

  // If no stock levels exist, try re-importing from CSV
  if (existingCount === 0 && existsSync(STOCK_CSV_PATH)) {
    console.log(`   No stock levels found. Re-importing from CSV...`);

    if (!DRY_RUN) {
      const csvContent = readFileSync(STOCK_CSV_PATH, 'utf-8');
      const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string, i: number) => (i === 0 ? stripBom(h) : h).trim(),
      });

      const rows = parsed.data
        .filter((row) => {
          const firstVal = Object.values(row)[0];
          return firstVal && firstVal.trim() !== '';
        })
        .map((row) => applyMapping(row, KIVITENDO_STOCK_PROFILE));

      console.log(`   Parsed ${rows.length} rows from stock CSV`);

      const productLookup = await buildProductLookup(db, companyId);

      // Find default warehouse
      const [warehouse] = await db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.companyId, companyId), eq(warehouses.isDefault, true)))
        .limit(1);

      if (!warehouse) {
        console.log('   [skip] No default warehouse found — cannot re-import stock');
        return { found: 0, fixed: 0, errors: ['No default warehouse found'] };
      }

      const result = await bulkInsertStockLevels(db, companyId, warehouse.id, rows, productLookup);
      console.log(`   Re-imported: inserted=${result.inserted} skipped=${result.skipped} errors=${result.errors.length}`);

      return { found: rows.length, fixed: result.inserted, errors: result.errors };
    } else {
      console.log(`   (dry-run) Would re-import stock from CSV`);
      return { found: 0, fixed: 0, errors };
    }
  }

  // Sync products.stockQuantity from stock_levels
  if (DRY_RUN) {
    // Count how many products would be updated
    const mismatchCount = await db.execute<{ cnt: string }>(sql`
      SELECT COUNT(*) as cnt
      FROM products p
      WHERE p.company_id = ${companyId}
        AND p.stock_quantity::numeric != COALESCE(
          (SELECT SUM(sl.quantity::numeric) FROM stock_levels sl WHERE sl.product_id = p.id),
          0
        )
    `);
    const mismatchRows = mismatchCount.rows ?? mismatchCount;
    const mismatches = parseInt((mismatchRows as Array<{ cnt: string }>)[0]?.cnt || '0', 10);
    console.log(`   (dry-run) Would sync stockQuantity on ${mismatches} products`);
    return { found: mismatches, fixed: 0, errors };
  }

  // Perform the sync
  const updateResult = await db.execute(sql`
    UPDATE products
    SET stock_quantity = COALESCE(
      (SELECT SUM(quantity::numeric) FROM stock_levels WHERE product_id = products.id),
      0
    ),
    updated_at = NOW()
    WHERE company_id = ${companyId}
      AND stock_quantity::numeric != COALESCE(
        (SELECT SUM(quantity::numeric) FROM stock_levels WHERE product_id = products.id),
        0
      )
  `);

  const rowCount = (updateResult as any).rowCount ?? (updateResult as any).count ?? 0;
  console.log(`   Synced stockQuantity on ${rowCount} products`);

  return { found: existingCount, fixed: rowCount, errors };
}

// ============================================================================
// STEP A6: Update Number Sequences
// ============================================================================

async function fixNumberSequences(db: Database, companyId: string): Promise<StepResult> {
  console.log('Step A6: Update Number Sequences');

  if (DRY_RUN) {
    console.log('   (dry-run) Would update number sequences');
    return { found: 0, fixed: 0, errors: [] };
  }

  try {
    await updateSequencesAfterImport(db, companyId);
    console.log('   Number sequences updated');
    return { found: 1, fixed: 1, errors: [] };
  } catch (err) {
    const msg = (err as Error).message;
    console.log(`   Error: ${msg}`);
    return { found: 1, fixed: 0, errors: [msg] };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  loadEnv();

  const COMPANY_ID = process.env.COMPANY_ID;
  if (!COMPANY_ID) {
    console.error('COMPANY_ID environment variable is required');
    process.exit(1);
  }

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== DATA CLEANUP ===');
  console.log(`Company: ${COMPANY_ID}`);
  console.log();

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  // Use appropriate driver based on environment
  const db = createPostgresClient(process.env.DATABASE_URL) as unknown as Database;

  // Verify the company exists by looking up a user
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.companyId, COMPANY_ID))
    .limit(1);

  if (!user) {
    console.error('No user found for this company. Check COMPANY_ID.');
    process.exit(1);
  }
  console.log(`Verified company (user: ${user.id})`);
  console.log();

  // ---------------------------------------------------------------
  // Run all steps sequentially
  // ---------------------------------------------------------------

  const summary: Array<{ step: string; result: StepResult }> = [];

  // A1: Deduplicate Products
  const a1 = await deduplicateProducts(db, COMPANY_ID);
  summary.push({ step: 'A1 Dedup Products', result: a1 });
  console.log();

  // A2: Remove Orphan Invoices
  const a2 = await removeOrphanInvoices(db, COMPANY_ID);
  summary.push({ step: 'A2 Orphan Invoices', result: a2 });
  console.log();

  // A3: Fix Invoice Line Items
  const a3 = await fixInvoiceLineItems(db, COMPANY_ID);
  summary.push({ step: 'A3 Fix Line Items', result: a3 });
  console.log();

  // A4: Deduplicate Warehouses
  const a4 = await deduplicateWarehouses(db, COMPANY_ID);
  summary.push({ step: 'A4 Dedup Warehouses', result: a4 });
  console.log();

  // A5: Fix Stock Levels
  const a5 = await fixStockLevels(db, COMPANY_ID);
  summary.push({ step: 'A5 Fix Stock', result: a5 });
  console.log();

  // A6: Update Number Sequences
  const a6 = await fixNumberSequences(db, COMPANY_ID);
  summary.push({ step: 'A6 Sequences', result: a6 });
  console.log();

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------

  console.log('=== SUMMARY ===');
  console.log('Step                | Found  | Fixed  | Errors');
  console.log('--------------------|--------|--------|-------');
  for (const { step, result } of summary) {
    const f = String(result.found).padStart(6);
    const x = String(result.fixed).padStart(6);
    const e = String(result.errors.length).padStart(6);
    console.log(`${step.padEnd(20)}|${f} |${x} |${e}`);
  }

  // Show first few errors from each step
  for (const { step, result } of summary) {
    if (result.errors.length > 0) {
      console.log(`\nErrors in ${step}:`);
      for (const err of result.errors.slice(0, 5)) {
        console.log(`  ${err}`);
      }
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more`);
      }
    }
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Run without --dry-run to apply changes.');
  } else {
    console.log('\nCleanup complete.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
