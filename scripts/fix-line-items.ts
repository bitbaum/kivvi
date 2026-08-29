#!/usr/bin/env tsx
/**
 * Fix Kivitendo Line Item Import
 *
 * One-time data fix script for Revamp-IT's imported documents.
 * Kivitendo puts line items as EXTRA COLUMNS beyond the CSV header.
 * PapaParser in header mode dropped them, resulting in:
 *   - 822 documents with 1 mangled item each (entire CSV row as description)
 *   - 923 documents with no items at all
 *
 * This script re-parses the original CSVs in array mode and inserts
 * proper structured line items.
 *
 * Usage:
 *   npx tsx scripts/fix-line-items.ts              # execute fix
 *   npx tsx scripts/fix-line-items.ts --dry-run     # parse & report only
 *
 * Requires DATABASE_URL env var (reads from .env.local if present).
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import Papa from "papaparse";
import Decimal from "decimal.js";
import { eq, and } from "drizzle-orm";
import {
  createPostgresClient,
  documents,
  documentItems,
  products,
  fiscalYears,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { parseKivitendoLineItems } from "@kivvi/core/src/domain/import-mappings";
import { updateSequencesAfterImport } from "@kivvi/core/src/domain/import-bulk";
import { DEFAULT_VAT_RATE } from "@kivvi/core/src/config/vat-rates";

// ============================================================================
// CONFIG
// ============================================================================

const COMPANY_ID = process.env.COMPANY_ID || "f713b82b-babb-46c1-aa67-95760fc00f7e";
const EXPORT_DIR = "/home/g/dev/kivvi/kivitendo-export";
const DRY_RUN = process.argv.includes("--dry-run");

// CSV file configs
const AR_FILE = "rechnungen_ar_invoices.csv";
const AP_FILE = "einkaufsrechnungen_ap_invoices.csv";

// Column indices (0-based) for raw CSV rows
const AR = {
  buchungsnummer: 2,
  summe: 12,
  steuersatz: 29,
  positionen: 36,
  headerCols: 48,
};

const AP = {
  buchungsnummer: 1,
  summe: 8,
  steuersatz: 22,
  positionen: 28,
  headerCols: 29,
};

// ============================================================================
// HELPERS
// ============================================================================

/** Load .env.local if DATABASE_URL is not set */
function loadEnv(): void {
  if (process.env.DATABASE_URL) return;

  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) {
    console.error("DATABASE_URL not set and no .env.local found");
    process.exit(1);
  }

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/** Map Steuersatz text label to VAT rate */
function mapVatRate(steuersatz: string): string {
  const trimmed = steuersatz?.trim();
  if (trimmed === "Inland") return DEFAULT_VAT_RATE;
  if (trimmed === "Außerhalb EU") return "0";
  // Try parsing as number (some exports might have numeric rates)
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num.toString();
  return DEFAULT_VAT_RATE;
}

/** Parse Swiss number format: strip apostrophe thousand separators */
function parseSwissNumber(value: string): string {
  if (!value?.trim()) return "0";
  return value.trim().replace(/'/g, "");
}

interface CsvInvoice {
  docNumber: string;
  total: string;
  vatRate: string;
  items: Array<{
    position: number;
    articleNumber: string;
    description: string;
    quantity: string;
    unit: string;
  }>;
}

/** Parse invoice CSV in array mode, extract structured line items */
function parseInvoiceCsv(
  filePath: string,
  config: typeof AR | typeof AP,
  isAP: boolean,
): CsvInvoice[] {
  const csvContent = readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<string[]>(csvContent, {
    header: false,
    skipEmptyLines: true,
  });

  const invoices: CsvInvoice[] = [];

  // Skip header row (first row)
  for (let i = 1; i < parsed.data.length; i++) {
    const row = parsed.data[i];

    // Skip sub-rows (echo rows with ≤10 columns) and rows where first position col is "Position" (sub-header)
    if (row.length <= 10) continue;
    if (row.length <= config.headerCols) continue;

    // This is a main invoice row with extra columns (has items)
    const docNumber = row[config.buchungsnummer]?.trim();
    if (!docNumber) continue;

    const items = parseKivitendoLineItems(row, config.positionen);

    // AP invoices have negative quantities — convert to positive
    if (isAP) {
      for (const item of items) {
        try {
          const qty = new Decimal(item.quantity || "0");
          if (qty.lt(0)) {
            item.quantity = qty.abs().toString();
          }
        } catch {
          // Keep original quantity if not parseable
        }
      }
    }

    if (items.length > 0) {
      invoices.push({
        docNumber,
        total: parseSwissNumber(row[config.summe] || "0"),
        vatRate: mapVatRate(row[config.steuersatz] || ""),
        items,
      });
    }
  }

  return invoices;
}

// ============================================================================
// DB LOOKUPS
// ============================================================================

interface ProductInfo {
  id: string;
  unitPrice: string;
  purchasePrice: string | null;
}

async function buildProductPriceLookup(
  db: Database,
  companyId: string,
): Promise<Map<string, ProductInfo>> {
  const rows = await db
    .select({
      id: products.id,
      articleNumber: products.articleNumber,
      unitPrice: products.unitPrice,
      purchasePrice: products.purchasePrice,
    })
    .from(products)
    .where(eq(products.companyId, companyId));

  const map = new Map<string, ProductInfo>();
  for (const row of rows) {
    if (row.articleNumber) {
      map.set(row.articleNumber, {
        id: row.id,
        unitPrice: row.unitPrice,
        purchasePrice: row.purchasePrice,
      });
    }
  }
  return map;
}

interface DocInfo {
  id: string;
  total: string;
}

async function buildDocumentLookup(
  db: Database,
  companyId: string,
  docType: "invoice" | "purchase_invoice",
): Promise<Map<string, DocInfo>> {
  const rows = await db
    .select({
      id: documents.id,
      number: documents.number,
      total: documents.total,
    })
    .from(documents)
    .where(and(eq(documents.companyId, companyId), eq(documents.type, docType)));

  const map = new Map<string, DocInfo>();
  for (const row of rows) {
    map.set(row.number, { id: row.id, total: row.total });
  }
  return map;
}

// ============================================================================
// FIX LOGIC
// ============================================================================

interface FixStats {
  fixed: number;
  skippedNoMatch: number;
  errors: string[];
}

async function fixDocumentItems(
  db: Database,
  csvInvoices: CsvInvoice[],
  docLookup: Map<string, DocInfo>,
  productLookup: Map<string, ProductInfo>,
  docType: "invoice" | "purchase_invoice",
): Promise<FixStats> {
  const stats: FixStats = { fixed: 0, skippedNoMatch: 0, errors: [] };

  for (const inv of csvInvoices) {
    const docInfo = docLookup.get(inv.docNumber);
    if (!docInfo) {
      stats.skippedNoMatch++;
      continue;
    }

    try {
      if (DRY_RUN) {
        stats.fixed++;
        continue;
      }

      await db.transaction(async (tx: Database) => {
        // Delete existing broken items
        await tx.delete(documentItems).where(eq(documentItems.documentId, docInfo.id));

        // Build new items
        const newItems = inv.items.map((item) => {
          const product = item.articleNumber ? productLookup.get(item.articleNumber) : undefined;

          // Determine unit price
          let unitPrice = "0";
          if (product) {
            // Use catalog price: sales price for AR, purchase price for AP
            if (docType === "purchase_invoice" && product.purchasePrice) {
              unitPrice = product.purchasePrice;
            } else {
              unitPrice = product.unitPrice;
            }
          } else if (inv.items.length === 1) {
            // Single-item doc without product match: derive from total / quantity
            try {
              const qty = new Decimal(item.quantity || "0");
              const docTotal = new Decimal(inv.total || "0");
              if (qty.gt(0) && docTotal.gt(0)) {
                unitPrice = docTotal.div(qty).toDecimalPlaces(2).toString();
              }
            } catch {
              // Keep unitPrice as '0'
            }
          }

          const qty = new Decimal(item.quantity || "0");
          const price = new Decimal(unitPrice);
          const total = qty.times(price).toDecimalPlaces(2).toString();

          return {
            documentId: docInfo.id,
            productId: product?.id || null,
            position: item.position,
            description: item.description || "Imported item",
            quantity: item.quantity || "1",
            unitPrice,
            vatRate: inv.vatRate,
            total,
          };
        });

        if (newItems.length > 0) {
          await tx.insert(documentItems).values(newItems);
        }
      });

      stats.fixed++;
    } catch (err) {
      stats.errors.push(`Doc ${inv.docNumber}: ${(err as Error).message}`);
    }
  }

  return stats;
}

// ============================================================================
// DUPLICATE FISCAL YEAR FIX
// ============================================================================

async function fixDuplicateFiscalYear(db: Database, companyId: string): Promise<void> {
  const years = await db
    .select({ id: fiscalYears.id, name: fiscalYears.name })
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, companyId));

  // Find duplicates by name
  const seen = new Map<string, string[]>();
  for (const y of years) {
    const ids = seen.get(y.name) || [];
    ids.push(y.id);
    seen.set(y.name, ids);
  }

  for (const [name, ids] of seen) {
    if (ids.length > 1) {
      // Keep the first, delete the rest
      const toDelete = ids.slice(1);
      console.log(`  Removing ${toDelete.length} duplicate fiscal year(s) for "${name}"`);
      if (!DRY_RUN) {
        for (const id of toDelete) {
          await db.delete(fiscalYears).where(eq(fiscalYears.id, id));
        }
      }
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = createPostgresClient(process.env.DATABASE_URL);

  console.log(DRY_RUN ? "=== DRY RUN MODE ===" : "=== EXECUTING FIX ===");
  console.log(`Company: ${COMPANY_ID}`);
  console.log(`Export dir: ${EXPORT_DIR}\n`);

  // Step 1: Parse CSVs
  console.log("1. Parsing CSV files...");

  const arPath = join(EXPORT_DIR, AR_FILE);
  const apPath = join(EXPORT_DIR, AP_FILE);

  if (!existsSync(arPath)) {
    console.error(`AR file not found: ${arPath}`);
    process.exit(1);
  }

  const arInvoices = parseInvoiceCsv(arPath, AR, false);
  console.log(`   AR invoices with items: ${arInvoices.length}`);
  // Show sample
  if (arInvoices.length > 0) {
    const sample = arInvoices[0];
    console.log(
      `   Sample: #${sample.docNumber} — ${sample.items.length} items, total=${sample.total}`,
    );
    for (const item of sample.items.slice(0, 3)) {
      console.log(
        `     pos ${item.position}: [${item.articleNumber}] ${item.description.slice(0, 50)} qty=${item.quantity} unit=${item.unit}`,
      );
    }
  }

  let apInvoices: CsvInvoice[] = [];
  if (existsSync(apPath)) {
    apInvoices = parseInvoiceCsv(apPath, AP, true);
    console.log(`   AP invoices with items: ${apInvoices.length}`);
    if (apInvoices.length > 0) {
      const sample = apInvoices[0];
      console.log(
        `   Sample: #${sample.docNumber} — ${sample.items.length} items, total=${sample.total}`,
      );
      for (const item of sample.items.slice(0, 3)) {
        console.log(
          `     pos ${item.position}: [${item.articleNumber}] ${item.description.slice(0, 50)} qty=${item.quantity} unit=${item.unit}`,
        );
      }
    }
  }

  // Step 2: Build lookups
  console.log("\n2. Building DB lookups...");
  const productLookup = await buildProductPriceLookup(db, COMPANY_ID);
  console.log(`   Products: ${productLookup.size}`);

  const arDocLookup = await buildDocumentLookup(db, COMPANY_ID, "invoice");
  console.log(`   AR documents in DB: ${arDocLookup.size}`);

  const apDocLookup = await buildDocumentLookup(db, COMPANY_ID, "purchase_invoice");
  console.log(`   AP documents in DB: ${apDocLookup.size}`);

  // Step 3: Fix AR items
  console.log("\n3. Fixing AR invoice items...");
  const arStats = await fixDocumentItems(db, arInvoices, arDocLookup, productLookup, "invoice");
  console.log(
    `   Fixed: ${arStats.fixed}, No match: ${arStats.skippedNoMatch}, Errors: ${arStats.errors.length}`,
  );
  if (arStats.errors.length > 0) {
    for (const err of arStats.errors.slice(0, 5)) {
      console.log(`   ERR: ${err}`);
    }
    if (arStats.errors.length > 5) {
      console.log(`   ... and ${arStats.errors.length - 5} more errors`);
    }
  }

  // Step 4: Fix AP items
  console.log("\n4. Fixing AP purchase invoice items...");
  const apStats = await fixDocumentItems(
    db,
    apInvoices,
    apDocLookup,
    productLookup,
    "purchase_invoice",
  );
  console.log(
    `   Fixed: ${apStats.fixed}, No match: ${apStats.skippedNoMatch}, Errors: ${apStats.errors.length}`,
  );
  if (apStats.errors.length > 0) {
    for (const err of apStats.errors.slice(0, 5)) {
      console.log(`   ERR: ${err}`);
    }
    if (apStats.errors.length > 5) {
      console.log(`   ... and ${apStats.errors.length - 5} more errors`);
    }
  }

  // Step 5: Update number sequences
  console.log("\n5. Updating number sequences...");
  if (!DRY_RUN) {
    await updateSequencesAfterImport(db, COMPANY_ID);
    console.log("   Done");
  } else {
    console.log("   (skipped in dry-run)");
  }

  // Step 6: Fix duplicate fiscal year
  console.log("\n6. Fixing duplicate fiscal years...");
  await fixDuplicateFiscalYear(db, COMPANY_ID);

  // Summary
  console.log("\n=== SUMMARY ===");
  console.log(`AR invoices fixed: ${arStats.fixed}/${arInvoices.length}`);
  console.log(`AP invoices fixed: ${apStats.fixed}/${apInvoices.length}`);
  console.log(`Total errors: ${arStats.errors.length + apStats.errors.length}`);

  if (DRY_RUN) {
    console.log("\nDry run complete. Run without --dry-run to apply changes.");
  } else {
    console.log("\nDone!");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
