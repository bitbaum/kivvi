#!/usr/bin/env tsx
/**
 * Comprehensive Kivitendo → Kivvi Import Script
 *
 * Imports ALL data from kivitendo CSV exports in FK dependency order.
 * Designed for revamp-it migration; reusable for other customer migrations.
 *
 * Usage:
 *   COMPANY_ID=<uuid> pnpm tsx scripts/import-kivitendo.ts
 *   COMPANY_ID=<uuid> pnpm tsx scripts/import-kivitendo.ts --dry-run
 *
 * Requires:
 *   - COMPANY_ID env var (uuid of target company)
 *   - DATABASE_URL env var (or .env.local in project root)
 *   - CSV files in ./kivitendo-export/ (relative to project root)
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import Papa from 'papaparse';
import Decimal from 'decimal.js';
import { eq, and } from 'drizzle-orm';
import { neonConfig } from '@neondatabase/serverless';
import nodeFetch from 'node-fetch';
import {
  createNeonClient,
  documents,
  documentItems,
  users,
  warehouses,
} from '@kivvi/database';
import type { Database } from '@kivvi/database';

// Set node-fetch before any neon() calls (must be at module level)
neonConfig.fetchFunction = nodeFetch as any;
import {
  applyMapping,
  cleanHeaders,
  parseSwissDate,
  parseSwissNumber,
  parseKivitendoLineItems,
  stripBom,
  KIVITENDO_CUSTOMER_PROFILE,
  KIVITENDO_VENDOR_PROFILE,
  KIVITENDO_PRODUCT_PROFILE,
  KIVITENDO_PROJECT_PROFILE,
  KIVITENDO_GL_PROFILE,
  KIVITENDO_STOCK_PROFILE,
} from '@kivvi/core/src/domain/import-mappings';
import type { ParsedLineItem } from '@kivvi/core/src/domain/import-mappings';
import {
  bulkInsertContacts,
  bulkInsertContactAddresses,
  bulkInsertProducts,
  bulkInsertProjects,
  bulkInsertDocuments,
  bulkInsertJournalEntries,
  bulkInsertStockLevels,
  buildContactLookup,
  buildProductLookup,
  buildAccountCodeMap,
  ensureProductGroups,
  ensureManufacturers,
  updateSequencesAfterImport,
} from '@kivvi/core/src/domain/import-bulk';
import type { BulkInsertResult } from '@kivvi/core/src/domain/import-bulk';
import { DEFAULT_VAT_RATE } from '@kivvi/core/src/config/vat-rates';

// ============================================================================
// CONFIG
// ============================================================================

const DRY_RUN = process.argv.includes('--dry-run');
const PROJECT_ROOT = resolve(__dirname, '..');
const EXPORT_DIR = join(PROJECT_ROOT, 'kivitendo-export');

// CSV file names
const FILES = {
  customers: 'kunden_customers.csv',
  vendors: 'lieferanten_vendors.csv',
  products: 'artikel_products.csv',
  projects: 'projekte_projects.csv',
  arInvoices: 'rechnungen_ar_invoices.csv',
  apInvoices: 'einkaufsrechnungen_ap_invoices.csv',
  salesOrders: 'auftraege_sales_orders.csv',
  quotes: 'angebote_quotes.csv',
  deliveryNotes: 'lieferscheine_delivery_notes.csv',
  journal: 'buchungsjournal_gl.csv',
  stock: 'lagerbestand_warehouse_stock.csv',
} as const;

// Column index configs for array-mode document parsing (0-based)
interface DocColumnConfig {
  buchungsnummer: number;
  number: number;       // human-readable doc number
  datum: number;
  contact: number;      // Kundennummer or Lieferantennummer
  summe: number | null;
  bezahlt: number | null;
  zahlungsdatum: number | null;
  faelligkeitsdatum: number | null;
  offen: number | null;
  geliefert: number | null;
  steuersatz: number | null;
  positionen: number;
  headerCols: number;
}

const AR_CONFIG: DocColumnConfig = {
  buchungsnummer: 2,
  number: 4,          // Rechnung
  datum: 1,
  contact: 26,        // Kundennummer
  summe: 12,
  bezahlt: 13,
  zahlungsdatum: 14,
  faelligkeitsdatum: 16,
  offen: null,
  geliefert: null,
  steuersatz: 29,
  positionen: 36,
  headerCols: 48,
};

const AP_CONFIG: DocColumnConfig = {
  buchungsnummer: 1,
  number: 3,          // Rechnung
  datum: 0,
  contact: 19,        // Lieferantennummer
  summe: 8,
  bezahlt: 9,
  zahlungsdatum: 10,
  faelligkeitsdatum: 12,
  offen: null,
  geliefert: null,
  steuersatz: 22,
  positionen: 28,
  headerCols: 29,
};

const SALES_ORDER_CONFIG: DocColumnConfig = {
  buchungsnummer: 3,
  number: 4,          // Auftrag
  datum: 1,
  contact: 22,        // Kundennummer
  summe: 9,
  bezahlt: null,
  zahlungsdatum: null,
  faelligkeitsdatum: null,
  offen: 18,
  geliefert: null,
  steuersatz: 26,
  positionen: 31,
  headerCols: 42,
};

const QUOTE_CONFIG: DocColumnConfig = {
  buchungsnummer: 2,
  number: 3,          // Angebot
  datum: 0,
  contact: 19,        // Kundennummer
  summe: 7,
  bezahlt: null,
  zahlungsdatum: null,
  faelligkeitsdatum: null,
  offen: 16,
  geliefert: null,
  steuersatz: 23,
  positionen: 30,
  headerCols: 41,
};

const DELIVERY_NOTE_CONFIG: DocColumnConfig = {
  buchungsnummer: 3,
  number: 4,          // Lieferschein
  datum: 1,
  contact: 6,         // Kundennummer
  summe: null,
  bezahlt: null,
  zahlungsdatum: null,
  faelligkeitsdatum: null,
  offen: 15,
  geliefert: 16,
  steuersatz: null,
  positionen: 18,
  headerCols: 19,
};

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

/** Read CSV file, return raw content */
function readCsv(filename: string): string | null {
  const filePath = join(EXPORT_DIR, filename);
  if (!existsSync(filePath)) {
    console.log(`   [skip] File not found: ${filename}`);
    return null;
  }
  return readFileSync(filePath, 'utf-8');
}

/** Parse CSV in header mode, apply mapping profile */
function parseHeaderMode(
  csvContent: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any,
): Array<Record<string, string | null>> {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string, i: number) => {
      let cleaned = i === 0 ? stripBom(h) : h;
      return cleaned.trim();
    },
  });

  return parsed.data
    .filter((row) => {
      // Filter subtotal/empty rows
      const firstVal = Object.values(row)[0];
      return firstVal && firstVal.trim() !== '';
    })
    .map((row) => applyMapping(row, profile));
}

/** Map Steuersatz text label to VAT rate number */
function mapVatRate(steuersatz: string): string {
  const trimmed = steuersatz?.trim();
  if (trimmed === 'Inland') return DEFAULT_VAT_RATE;
  if (trimmed === 'Außerhalb EU') return '0';
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num.toString();
  return DEFAULT_VAT_RATE;
}

/** Parse Swiss number: strip apostrophe thousand separators */
function parseSwissNum(value: string): string {
  if (!value?.trim()) return '0';
  return value.trim().replace(/'/g, '');
}

/** Parse Swiss date from raw CSV value */
function parseDate(value: string): string | null {
  if (!value?.trim()) return null;
  return parseSwissDate(value);
}

/** Format result for console */
function formatResult(result: BulkInsertResult): string {
  let msg = `inserted=${result.inserted} skipped=${result.skipped}`;
  if (result.errors.length > 0) {
    msg += ` errors=${result.errors.length}`;
  }
  return msg;
}

// ============================================================================
// DOCUMENT PARSING (Array mode)
// ============================================================================

interface ParsedDocument {
  buchungsnummer: string;
  number: string;          // human-readable
  datum: string | null;
  contactNumber: string;
  summe: string;
  bezahlt: string;
  zahlungsdatum: string | null;
  faelligkeitsdatum: string | null;
  offen: string;
  geliefert: string;
  vatRate: string;
  items: ParsedLineItem[];
}

/**
 * Parse a document CSV in array mode (header: false) to preserve
 * extra columns containing line item data.
 */
function parseDocumentCsv(
  csvContent: string,
  config: DocColumnConfig,
  isAP: boolean,
): ParsedDocument[] {
  const parsed = Papa.parse<string[]>(csvContent, {
    header: false,
    skipEmptyLines: true,
  });

  const docs: ParsedDocument[] = [];

  // Skip header row
  for (let i = 1; i < parsed.data.length; i++) {
    const row = parsed.data[i];

    // Skip sub-rows and rows without extra columns
    if (row.length <= 10) continue;
    if (row.length <= config.headerCols) continue;

    const buchungsnummer = row[config.buchungsnummer]?.trim();
    if (!buchungsnummer) continue;

    const number = row[config.number]?.trim() || buchungsnummer;

    const items = parseKivitendoLineItems(row, config.positionen);

    // AP invoices have negative quantities — convert to positive
    if (isAP) {
      for (const item of items) {
        try {
          const qty = new Decimal(item.quantity || '0');
          if (qty.lt(0)) {
            item.quantity = qty.abs().toString();
          }
        } catch {
          // Keep original
        }
      }
    }

    docs.push({
      buchungsnummer,
      number,
      datum: parseDate(row[config.datum] || ''),
      contactNumber: row[config.contact]?.trim() || '',
      summe: config.summe !== null ? parseSwissNum(row[config.summe] || '0') : '0',
      bezahlt: config.bezahlt !== null ? parseSwissNum(row[config.bezahlt] || '0') : '0',
      zahlungsdatum: config.zahlungsdatum !== null ? parseDate(row[config.zahlungsdatum] || '') : null,
      faelligkeitsdatum: config.faelligkeitsdatum !== null ? parseDate(row[config.faelligkeitsdatum] || '') : null,
      offen: config.offen !== null ? row[config.offen]?.trim() || '' : '',
      geliefert: config.geliefert !== null ? row[config.geliefert]?.trim() || '' : '',
      vatRate: config.steuersatz !== null ? mapVatRate(row[config.steuersatz] || '') : DEFAULT_VAT_RATE,
      items,
    });
  }

  return docs;
}

/**
 * Insert parsed documents into the database.
 * Each ParsedDocument becomes one document + N documentItems.
 */
async function insertDocuments(
  db: Database,
  companyId: string,
  userId: string,
  parsedDocs: ParsedDocument[],
  contactLookup: Map<string, string>,
  productLookup: Map<string, string>,
  documentType: 'invoice' | 'purchase_invoice' | 'quote' | 'order' | 'delivery_note',
  statusFn: (doc: ParsedDocument) => string,
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Deduplicate by buchungsnummer (keep first occurrence)
  const seen = new Set<string>();
  const uniqueDocs: ParsedDocument[] = [];
  for (const doc of parsedDocs) {
    if (!seen.has(doc.buchungsnummer)) {
      seen.add(doc.buchungsnummer);
      uniqueDocs.push(doc);
    }
  }

  for (const doc of uniqueDocs) {
    try {
      if (!doc.datum) {
        skipped++;
        continue;
      }

      const issueDate = new Date(doc.datum);
      if (isNaN(issueDate.getTime())) {
        skipped++;
        continue;
      }

      const contactId = doc.contactNumber
        ? contactLookup.get(doc.contactNumber) || null
        : null;

      const status = statusFn(doc);
      const dueDate = doc.faelligkeitsdatum ? new Date(doc.faelligkeitsdatum) : null;
      const zahlungsDatum = doc.zahlungsdatum ? new Date(doc.zahlungsdatum) : null;

      if (DRY_RUN) {
        inserted++;
        continue;
      }

      await db.transaction(async (tx) => {
        const [docRow] = await tx
          .insert(documents)
          .values({
            companyId,
            contactId,
            type: documentType,
            status,
            number: doc.number,
            issueDate,
            dueDate,
            paidDate: status === 'paid' ? zahlungsDatum : null,
            subtotal: doc.summe,
            vatAmount: '0',
            total: doc.summe,
            createdBy: userId,
          })
          .onConflictDoNothing()
          .returning();

        if (!docRow) {
          throw new Error('Document already exists');
        }

        if (doc.items.length > 0) {
          await tx.insert(documentItems).values(
            doc.items.map((item) => {
              const productId = item.articleNumber
                ? productLookup.get(item.articleNumber) || null
                : null;

              // Determine unit price from product catalog or derive from total
              let unitPrice = '0';
              if (productId) {
                // Will be 0 since we don't have price in the lookup here,
                // but the product reference is what matters for the import
              }
              if (doc.items.length === 1 && !productId) {
                try {
                  const qty = new Decimal(item.quantity || '0');
                  const total = new Decimal(doc.summe || '0');
                  if (qty.gt(0) && total.gt(0)) {
                    unitPrice = total.div(qty).toDecimalPlaces(2).toString();
                  }
                } catch {
                  // Keep 0
                }
              }

              const qty = new Decimal(item.quantity || '0');
              const price = new Decimal(unitPrice);
              const lineTotal = qty.times(price).toDecimalPlaces(2).toString();

              return {
                documentId: docRow.id,
                productId,
                position: item.position,
                description: item.description || 'Imported item',
                quantity: item.quantity || '1',
                unitPrice,
                vatRate: doc.vatRate,
                total: lineTotal,
              };
            })
          );
        }
      });

      inserted++;
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.includes('already exists')) {
        errors.push(`Doc ${doc.number}: ${msg}`);
      }
      skipped++;
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================================
// STATUS DETERMINATION
// ============================================================================

function invoiceStatus(doc: ParsedDocument): string {
  try {
    const paid = new Decimal(doc.bezahlt || '0');
    const total = new Decimal(doc.summe || '0');
    if (paid.gte(total) && total.gt(0)) return 'paid';
  } catch { /* keep default */ }
  return 'sent';
}

function salesOrderStatus(doc: ParsedDocument): string {
  if (doc.offen === 'Ja') return 'confirmed';
  return 'delivered';
}

function quoteStatus(doc: ParsedDocument): string {
  if (doc.offen === 'Ja') return 'sent';
  return 'confirmed';
}

function deliveryNoteStatus(doc: ParsedDocument): string {
  if (doc.geliefert === 'Ja') return 'delivered';
  return 'sent';
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
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== KIVITENDO IMPORT ===');
  console.log(`Company: ${COMPANY_ID}`);
  console.log(`Export dir: ${EXPORT_DIR}`);
  console.log();

  // In dry-run mode, DB connection is optional (only parses CSVs)
  let db: Database | null = null;
  let userId = 'dry-run';

  if (!DRY_RUN) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is required');
      process.exit(1);
    }
    // Use Neon HTTP driver (TCP times out from this machine; node-fetch configured in package)
    db = createNeonClient(process.env.DATABASE_URL) as unknown as Database;

    // Neon HTTP driver doesn't support transactions — patch to run sequentially.
    // For a migration script this is fine; individual inserts are still atomic.
    (db as any).transaction = async (fn: (tx: any) => Promise<any>) => fn(db);

    // Look up first user for createdBy
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.companyId, COMPANY_ID))
      .limit(1);

    if (!user) {
      console.error('No user found for this company. Create a user first.');
      process.exit(1);
    }
    userId = user.id;
    console.log(`Using user: ${userId}`);
  } else if (process.env.DATABASE_URL) {
    // In dry-run, connect if available (for lookup counts) but don't require it
    try {
      db = createNeonClient(process.env.DATABASE_URL) as unknown as Database;
    } catch {
      // Fine, dry-run works without DB
    }
  }
  console.log();

  const summary: Array<{ step: string; result: BulkInsertResult | null }> = [];

  // ---------------------------------------------------------------
  // Step 1/13: Customers
  // ---------------------------------------------------------------
  console.log('Step  1/14: Customers');
  const customersCsv = readCsv(FILES.customers);
  let customersResult: BulkInsertResult | null = null;
  if (customersCsv) {
    const rows = parseHeaderMode(customersCsv, KIVITENDO_CUSTOMER_PROFILE);
    console.log(`   Parsed: ${rows.length} rows`);
    if (!DRY_RUN && db) {
      customersResult = await bulkInsertContacts(db, COMPANY_ID, rows, 'customer');
    } else {
      customersResult = { inserted: rows.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(customersResult)}`);
  }
  summary.push({ step: 'Customers', result: customersResult });

  // ---------------------------------------------------------------
  // Step 2/13: Vendors
  // ---------------------------------------------------------------
  console.log('Step  2/14: Vendors');
  const vendorsCsv = readCsv(FILES.vendors);
  let vendorsResult: BulkInsertResult | null = null;
  if (vendorsCsv) {
    const rows = parseHeaderMode(vendorsCsv, KIVITENDO_VENDOR_PROFILE);
    console.log(`   Parsed: ${rows.length} rows`);
    if (!DRY_RUN && db) {
      vendorsResult = await bulkInsertContacts(db, COMPANY_ID, rows, 'vendor');
    } else {
      vendorsResult = { inserted: rows.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(vendorsResult)}`);
  }
  summary.push({ step: 'Vendors', result: vendorsResult });

  // ---------------------------------------------------------------
  // Step 3/14: Contact Addresses (from address fields on contacts)
  // ---------------------------------------------------------------
  console.log('Step  3/14: Contact Addresses');
  let addressResult: BulkInsertResult | null = null;
  if (!DRY_RUN && db) {
    addressResult = await bulkInsertContactAddresses(db, COMPANY_ID);
  } else {
    addressResult = { inserted: 0, skipped: 0, errors: [] };
  }
  console.log(`   ${formatResult(addressResult)}`);
  summary.push({ step: 'Addresses', result: addressResult });

  // ---------------------------------------------------------------
  // Step 4/14: Product Groups (extracted from products CSV)
  // ---------------------------------------------------------------
  console.log('Step  4/14: Product Groups');
  const productsCsv = readCsv(FILES.products);
  let productGroupMap = new Map<string, string>();
  let manufacturerMap = new Map<string, string>();
  if (productsCsv) {
    const parsed = Papa.parse<Record<string, string>>(productsCsv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string, i: number) => (i === 0 ? stripBom(h) : h).trim(),
    });

    const groupNames = parsed.data
      .map((r) => r['Warengruppe']?.trim())
      .filter(Boolean) as string[];
    console.log(`   Unique groups: ${new Set(groupNames).size}`);

    if (!DRY_RUN && db) {
      productGroupMap = await ensureProductGroups(db, COMPANY_ID, groupNames);
    }
    console.log(`   Done`);

    // ---------------------------------------------------------------
    // Step 4/13: Manufacturers (extracted from products CSV)
    // ---------------------------------------------------------------
    console.log('Step  5/14: Manufacturers');
    const mfgNames = parsed.data
      .map((r) => r['Hersteller']?.trim())
      .filter(Boolean) as string[];
    console.log(`   Unique manufacturers: ${new Set(mfgNames).size}`);

    if (!DRY_RUN && db) {
      manufacturerMap = await ensureManufacturers(db, COMPANY_ID, mfgNames);
    }
    console.log(`   Done`);
  } else {
    console.log('Step  5/14: Manufacturers');
    console.log('   [skip] No products CSV');
  }
  summary.push({ step: 'Product Groups', result: null });
  summary.push({ step: 'Manufacturers', result: null });

  // ---------------------------------------------------------------
  // Step 5/13: Products
  // ---------------------------------------------------------------
  console.log('Step  6/14: Products');
  let productsResult: BulkInsertResult | null = null;
  if (productsCsv) {
    const rows = parseHeaderMode(productsCsv, KIVITENDO_PRODUCT_PROFILE);
    console.log(`   Parsed: ${rows.length} rows`);
    if (!DRY_RUN && db) {
      productsResult = await bulkInsertProducts(db, COMPANY_ID, rows, productGroupMap, manufacturerMap);
    } else {
      productsResult = { inserted: rows.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(productsResult)}`);
  }
  summary.push({ step: 'Products', result: productsResult });

  // ---------------------------------------------------------------
  // Step 6/13: Projects
  // ---------------------------------------------------------------
  console.log('Step  7/14: Projects');
  const projectsCsv = readCsv(FILES.projects);
  let projectsResult: BulkInsertResult | null = null;
  if (projectsCsv) {
    const rows = parseHeaderMode(projectsCsv, KIVITENDO_PROJECT_PROFILE);
    console.log(`   Parsed: ${rows.length} rows`);
    if (!DRY_RUN && db) {
      projectsResult = await bulkInsertProjects(db, COMPANY_ID, rows);
    } else {
      projectsResult = { inserted: rows.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(projectsResult)}`);
  }
  summary.push({ step: 'Projects', result: projectsResult });

  // ---------------------------------------------------------------
  // Build lookups for document imports
  // ---------------------------------------------------------------
  console.log('\nBuilding lookups for document imports...');
  const contactLookup = (!DRY_RUN && db) ? await buildContactLookup(db, COMPANY_ID) : new Map<string, string>();
  const productLookup = (!DRY_RUN && db) ? await buildProductLookup(db, COMPANY_ID) : new Map<string, string>();
  console.log(`   Contacts: ${contactLookup.size}, Products: ${productLookup.size}`);
  console.log();

  // ---------------------------------------------------------------
  // Step 7/13: AR Invoices
  // ---------------------------------------------------------------
  console.log('Step  8/14: AR Invoices');
  const arCsv = readCsv(FILES.arInvoices);
  let arResult: BulkInsertResult | null = null;
  if (arCsv) {
    const docs = parseDocumentCsv(arCsv, AR_CONFIG, false);
    const totalItems = docs.reduce((s, d) => s + d.items.length, 0);
    console.log(`   Parsed: ${docs.length} invoices, ${totalItems} line items`);
    if (db) {
      arResult = await insertDocuments(
        db, COMPANY_ID, userId, docs,
        contactLookup, productLookup, 'invoice', invoiceStatus,
      );
    } else {
      arResult = { inserted: docs.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(arResult)}`);
  }
  summary.push({ step: 'AR Invoices', result: arResult });

  // ---------------------------------------------------------------
  // Step 8/13: AP Invoices
  // ---------------------------------------------------------------
  console.log('Step  9/14: AP Invoices');
  const apCsv = readCsv(FILES.apInvoices);
  let apResult: BulkInsertResult | null = null;
  if (apCsv) {
    const docs = parseDocumentCsv(apCsv, AP_CONFIG, true);
    const totalItems = docs.reduce((s, d) => s + d.items.length, 0);
    console.log(`   Parsed: ${docs.length} purchase invoices, ${totalItems} line items`);
    if (db) {
      apResult = await insertDocuments(
        db, COMPANY_ID, userId, docs,
        contactLookup, productLookup, 'purchase_invoice', invoiceStatus,
      );
    } else {
      apResult = { inserted: docs.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(apResult)}`);
  }
  summary.push({ step: 'AP Invoices', result: apResult });

  // ---------------------------------------------------------------
  // Step 9/13: Sales Orders
  // ---------------------------------------------------------------
  console.log('Step 10/14: Sales Orders');
  const soCsv = readCsv(FILES.salesOrders);
  let soResult: BulkInsertResult | null = null;
  if (soCsv) {
    const docs = parseDocumentCsv(soCsv, SALES_ORDER_CONFIG, false);
    const totalItems = docs.reduce((s, d) => s + d.items.length, 0);
    console.log(`   Parsed: ${docs.length} sales orders, ${totalItems} line items`);
    if (db) {
      soResult = await insertDocuments(
        db, COMPANY_ID, userId, docs,
        contactLookup, productLookup, 'order', salesOrderStatus,
      );
    } else {
      soResult = { inserted: docs.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(soResult)}`);
  }
  summary.push({ step: 'Sales Orders', result: soResult });

  // ---------------------------------------------------------------
  // Step 11/14: Quotes
  // ---------------------------------------------------------------
  console.log('Step 11/14: Quotes');
  const qtCsv = readCsv(FILES.quotes);
  let qtResult: BulkInsertResult | null = null;
  if (qtCsv) {
    const docs = parseDocumentCsv(qtCsv, QUOTE_CONFIG, false);
    const totalItems = docs.reduce((s, d) => s + d.items.length, 0);
    console.log(`   Parsed: ${docs.length} quotes, ${totalItems} line items`);
    if (db) {
      qtResult = await insertDocuments(
        db, COMPANY_ID, userId, docs,
        contactLookup, productLookup, 'quote', quoteStatus,
      );
    } else {
      qtResult = { inserted: docs.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(qtResult)}`);
  }
  summary.push({ step: 'Quotes', result: qtResult });

  // ---------------------------------------------------------------
  // Step 12/14: Delivery Notes
  // ---------------------------------------------------------------
  console.log('Step 12/14: Delivery Notes');
  const dnCsv = readCsv(FILES.deliveryNotes);
  let dnResult: BulkInsertResult | null = null;
  if (dnCsv) {
    const docs = parseDocumentCsv(dnCsv, DELIVERY_NOTE_CONFIG, false);
    const totalItems = docs.reduce((s, d) => s + d.items.length, 0);
    console.log(`   Parsed: ${docs.length} delivery notes, ${totalItems} line items`);
    if (db) {
      dnResult = await insertDocuments(
        db, COMPANY_ID, userId, docs,
        contactLookup, productLookup, 'delivery_note', deliveryNoteStatus,
      );
    } else {
      dnResult = { inserted: docs.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(dnResult)}`);
  }
  summary.push({ step: 'Delivery Notes', result: dnResult });

  // ---------------------------------------------------------------
  // Step 13/14: Journal Entries
  // ---------------------------------------------------------------
  console.log('Step 13/14: Journal Entries');
  const glCsv = readCsv(FILES.journal);
  let glResult: BulkInsertResult | null = null;
  if (glCsv) {
    const rows = parseHeaderMode(glCsv, KIVITENDO_GL_PROFILE);
    console.log(`   Parsed: ${rows.length} rows`);
    if (!DRY_RUN && db) {
      const accountCodeMap = await buildAccountCodeMap(db, COMPANY_ID);
      console.log(`   Account codes: ${accountCodeMap.size}`);
      glResult = await bulkInsertJournalEntries(db, COMPANY_ID, rows, accountCodeMap);
    } else {
      glResult = { inserted: rows.length, skipped: 0, errors: [] };
    }
    console.log(`   ${formatResult(glResult)}`);
  }
  summary.push({ step: 'Journal Entries', result: glResult });

  // ---------------------------------------------------------------
  // Step 14/14: Stock Levels
  // ---------------------------------------------------------------
  console.log('Step 14/14: Stock Levels');
  const stockCsv = readCsv(FILES.stock);
  let stockResult: BulkInsertResult | null = null;
  if (stockCsv) {
    const rows = parseHeaderMode(stockCsv, KIVITENDO_STOCK_PROFILE);
    console.log(`   Parsed: ${rows.length} rows`);
    if (!DRY_RUN && db) {
      // Refresh product lookup in case it was built before products were imported
      const freshProductLookup = await buildProductLookup(db, COMPANY_ID);

      // Find default warehouse
      const [warehouse] = await db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.companyId, COMPANY_ID), eq(warehouses.isDefault, true)))
        .limit(1);

      if (!warehouse) {
        console.log('   [skip] No default warehouse found');
      } else {
        stockResult = await bulkInsertStockLevels(db, COMPANY_ID, warehouse.id, rows, freshProductLookup);
      }
    } else {
      stockResult = { inserted: rows.length, skipped: 0, errors: [] };
    }
    if (stockResult) {
      console.log(`   ${formatResult(stockResult)}`);
    }
  }
  summary.push({ step: 'Stock Levels', result: stockResult });

  // ---------------------------------------------------------------
  // Final: Update number sequences
  // ---------------------------------------------------------------
  console.log('\nUpdating number sequences...');
  if (!DRY_RUN && db) {
    await updateSequencesAfterImport(db, COMPANY_ID);
    console.log('   Done');
  } else {
    console.log('   (skipped in dry-run)');
  }

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  console.log('\n=== SUMMARY ===');
  console.log('Step              | Inserted | Skipped | Errors');
  console.log('------------------|----------|---------|-------');
  for (const { step, result } of summary) {
    if (result) {
      const ins = String(result.inserted).padStart(8);
      const skip = String(result.skipped).padStart(7);
      const err = String(result.errors.length).padStart(6);
      console.log(`${step.padEnd(18)}|${ins} |${skip} |${err}`);
    } else {
      console.log(`${step.padEnd(18)}|      -- |     -- |    --`);
    }
  }

  // Show first few errors from each step
  for (const { step, result } of summary) {
    if (result && result.errors.length > 0) {
      console.log(`\nErrors in ${step}:`);
      for (const err of result.errors.slice(0, 3)) {
        console.log(`  ${err}`);
      }
      if (result.errors.length > 3) {
        console.log(`  ... and ${result.errors.length - 3} more`);
      }
    }
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Run without --dry-run to apply changes.');
  } else {
    console.log('\nImport complete.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
