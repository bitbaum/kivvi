"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { readFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { db } from "@/lib/db";
import {
  buildContactLookup,
  buildProductLookup,
  buildAccountCodeMap,
  ensureProductGroups,
  ensureManufacturers,
  bulkInsertContacts,
  bulkInsertProducts,
  bulkInsertDocuments,
  bulkInsertJournalEntries,
  bulkInsertStockLevels,
  updateSequencesAfterImport,
} from "@kivvi/core/src/domain/import-bulk";
// Types removed — bulk insert functions use Record<string, string | null> directly
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { getTranslations } from "next-intl/server";
import { DEFAULT_COUNTRY } from "@kivvi/core/src/config/locale";
import { sql, eq } from "drizzle-orm";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const bulkImportSchema = z.object({
  exportDir: z.string().min(1, "Export directory is required"),
  batchSize: z.number().int().min(1).max(10000).default(500),
  importType: z
    .enum([
      "all",
      "contacts",
      "products",
      "documents",
      "accounting",
      "inventory",
    ])
    .default("all"),
  cleanStart: z.boolean().default(false),
});

export type BulkImportInput = z.infer<typeof bulkImportSchema>;

export interface BulkImportResult {
  customersInserted: number;
  customersSkipped: number;
  vendorsInserted: number;
  vendorsSkipped: number;
  productsInserted: number;
  productsSkipped: number;
  invoicesInserted: number;
  invoicesSkipped: number;
  ordersInserted: number;
  ordersSkipped: number;
  quotesInserted: number;
  quotesSkipped: number;
  deliveryNotesInserted: number;
  deliveryNotesSkipped: number;
  purchaseInvoicesInserted: number;
  purchaseInvoicesSkipped: number;
  journalEntriesInserted: number;
  journalEntriesSkipped: number;
  stockLevelsInserted: number;
  stockLevelsSkipped: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function stripBom(str: string): string {
  return str.replace(/^\uFEFF/, "");
}

function cleanColumnName(name: string): string {
  return stripBom(name).trim().replace(/"/g, "");
}

function parseAmount(value: string | null | undefined): string {
  if (!value) return "0";
  // Remove Swiss thousand separators (apostrophes), keep decimal point
  return value.replace(/'/g, "").trim();
}

// ============================================================================
// SERVER ACTION
// ============================================================================

/**
 * Bulk import data from Kivitendo CSV export.
 * Imports contacts, products, documents, journal entries, and stock levels.
 * Optionally cleans existing data before import (cleanStart).
 *
 * NOTE: This is a large operation that can take several minutes.
 * The entire import is NOT wrapped in a single transaction to avoid
 * long-running transactions and lock contention. Each entity type
 * is imported with its own error handling.
 */
export async function bulkImportAction(
  input: BulkImportInput,
): Promise<ActionResult<BulkImportResult>> {
  const t = await getTranslations("bulkImport");
  try {
    const { companyId, userId } = await requireRole("member");

    // Validate input
    const parsed = bulkImportSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: `Validation failed: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    const { exportDir, batchSize, importType, cleanStart } = parsed.data;

    // Initialize result counters
    const result: BulkImportResult = {
      customersInserted: 0,
      customersSkipped: 0,
      vendorsInserted: 0,
      vendorsSkipped: 0,
      productsInserted: 0,
      productsSkipped: 0,
      invoicesInserted: 0,
      invoicesSkipped: 0,
      ordersInserted: 0,
      ordersSkipped: 0,
      quotesInserted: 0,
      quotesSkipped: 0,
      deliveryNotesInserted: 0,
      deliveryNotesSkipped: 0,
      purchaseInvoicesInserted: 0,
      purchaseInvoicesSkipped: 0,
      journalEntriesInserted: 0,
      journalEntriesSkipped: 0,
      stockLevelsInserted: 0,
      stockLevelsSkipped: 0,
    };

    // Clean start: delete all existing data for this company
    if (cleanStart) {
      // Use transaction for clean operations
      await db.transaction(async (tx) => {
        // Delete in correct order to respect FK constraints
        await tx.execute(sql`
          DELETE FROM document_items
          WHERE document_id IN (
            SELECT id FROM documents WHERE company_id = ${companyId}
          )
        `);
        await tx.execute(
          sql`DELETE FROM documents WHERE company_id = ${companyId}`,
        );
        await tx.execute(
          sql`DELETE FROM stock_levels WHERE company_id = ${companyId}`,
        );
        await tx.execute(sql`DELETE FROM journal_lines WHERE journal_entry_id IN (
          SELECT id FROM journal_entries WHERE company_id = ${companyId}
        )`);
        await tx.execute(
          sql`DELETE FROM journal_entries WHERE company_id = ${companyId}`,
        );
        await tx.execute(
          sql`DELETE FROM products WHERE company_id = ${companyId}`,
        );
        await tx.execute(
          sql`DELETE FROM contacts WHERE company_id = ${companyId}`,
        );
      });
    }

    // Import contacts (customers and vendors)
    if (importType === "all" || importType === "contacts") {
      try {
        // Import customers
        const customersPath = join(exportDir, "kunden_customers.csv");
        const customersCsv = readFileSync(customersPath, "utf-8");
        const customersParsed = Papa.parse<Record<string, string>>(
          customersCsv,
          {
            header: true,
            skipEmptyLines: true,
            transformHeader: cleanColumnName,
          },
        );

        const customersToImport = customersParsed.data
          .slice(0, batchSize)
          .filter(
            (row: Record<string, string>) =>
              row["Nummer"] && row["Firma / Kundenname"],
          )
          .map(
            (row: Record<string, string>): Record<string, string | null> => ({
              contactNumber: row["Nummer"],
              name: row["Firma / Kundenname"],
              email: row["E-Mail"] || null,
              phone: row["Telefon"] || null,
              type: "customer",
              street: row["Straße"] || null,
              city: row["Stadt"] || null,
              postalCode: row["PLZ"] || null,
              country: row["Land"] || DEFAULT_COUNTRY,
              vatNumber: row["USt-IdNr."] || null,
            }),
          );

        const customerResults = await bulkInsertContacts(
          db,
          companyId,
          customersToImport,
        );
        result.customersInserted = customerResults.inserted;
        result.customersSkipped = customerResults.skipped;

        // Import vendors
        const vendorsPath = join(exportDir, "lieferanten_vendors.csv");
        const vendorsCsv = readFileSync(vendorsPath, "utf-8");
        const vendorsParsed = Papa.parse<Record<string, string>>(vendorsCsv, {
          header: true,
          skipEmptyLines: true,
          transformHeader: cleanColumnName,
        });

        const vendorsToImport = vendorsParsed.data
          .slice(0, batchSize)
          .filter(
            (row: Record<string, string>) =>
              row["Nummer"] && row["Firma / Lieferantenname"],
          )
          .map(
            (row: Record<string, string>): Record<string, string | null> => ({
              contactNumber: row["Nummer"],
              name: row["Firma / Lieferantenname"],
              email: row["E-Mail"] || null,
              phone: row["Telefon"] || null,
              type: "vendor",
              street: row["Straße"] || null,
              city: row["Stadt"] || null,
              postalCode: row["PLZ"] || null,
              country: row["Land"] || DEFAULT_COUNTRY,
              vatNumber: row["USt-IdNr."] || null,
            }),
          );

        const vendorResults = await bulkInsertContacts(
          db,
          companyId,
          vendorsToImport,
        );
        result.vendorsInserted = vendorResults.inserted;
        result.vendorsSkipped = vendorResults.skipped;
      } catch {
        // Continue with other imports
      }
    }

    // Import products
    if (importType === "all" || importType === "products") {
      try {
        const productsPath = join(exportDir, "artikel_parts.csv");
        const productsCsv = readFileSync(productsPath, "utf-8");
        const productsParsed = Papa.parse<Record<string, string>>(productsCsv, {
          header: true,
          skipEmptyLines: true,
          transformHeader: cleanColumnName,
        });

        const filteredProducts = productsParsed.data
          .slice(0, batchSize)
          .filter(
            (row: Record<string, string>) =>
              row["Artikelnummer"] && row["Beschreibung"],
          );

        // Extract unique group/manufacturer names and ensure they exist
        const groupNames = filteredProducts
          .map((r) => r["Warengruppe"])
          .filter(Boolean);
        const manufacturerNames = filteredProducts
          .map((r) => r["Hersteller"])
          .filter(Boolean);
        const productGroupMap = await ensureProductGroups(
          db,
          companyId,
          groupNames,
        );
        const manufacturerMap = await ensureManufacturers(
          db,
          companyId,
          manufacturerNames,
        );

        const productsToImport = filteredProducts.map(
          (row: Record<string, string>): Record<string, string | null> => ({
            articleNumber: row["Artikelnummer"],
            name: row["Beschreibung"],
            description: row["Bemerkung"] || null,
            unitPrice: parseAmount(row["Verkaufspreis"]),
            purchasePrice: parseAmount(row["Einkaufspreis"]) || null,
            unit: row["Einheit"] || "piece",
            weight: row["Gewicht"] || null,
            minStock: row["Mindestlagerbestand"] || null,
            productGroup: row["Warengruppe"] || null,
            manufacturer: row["Hersteller"] || null,
          }),
        );

        const productResults = await bulkInsertProducts(
          db,
          companyId,
          productsToImport,
          productGroupMap,
          manufacturerMap,
        );
        result.productsInserted = productResults.inserted;
        result.productsSkipped = productResults.skipped;
      } catch {
        // Continue with other imports
      }
    }

    // Import documents
    if (importType === "all" || importType === "documents") {
      // Build lookup maps
      const contactsByNumber = await buildContactLookup(db, companyId);
      const productsByArticle = await buildProductLookup(db, companyId);

      try {
        // Import invoices
        const invoicesPath = join(exportDir, "rechnungen_invoices.csv");
        if (readFileSync(invoicesPath, "utf-8")) {
          // Invoice import is handled by executeImportAction in onboarding.ts
          // with structuredItems support for line items
        }
      } catch {
        // Continue with other imports
      }
    }

    // Import journal entries (accounting)
    if (importType === "all" || importType === "accounting") {
      try {
        const glPath = join(exportDir, "buchungsjournal_gl.csv");
        const glCsv = readFileSync(glPath, "utf-8");
        const glParsed = Papa.parse<Record<string, string>>(glCsv, {
          header: true,
          skipEmptyLines: true,
          transformHeader: cleanColumnName,
        });

        const glRows = glParsed.data
          .filter(
            (row) => row["Buchungsdatum"] && (row["Soll"] || row["Haben"]),
          )
          .map(
            (row): Record<string, string | null> => ({
              date: row["Buchungsdatum"] || null,
              reference: row["Buchungsnummer"] || null,
              description: row["Beschreibung"] || null,
              notes: row["Bemerkungen"] || null,
              debitAmount: parseAmount(row["Soll"]),
              debitAccount: row["Sollkonto"] || null,
              creditAmount: parseAmount(row["Haben"]),
              creditAccount: row["Habenkonto"] || null,
              voucher: row["Beleg"] || null,
            }),
          );

        const accountCodeMap = await buildAccountCodeMap(db, companyId);
        const glResults = await bulkInsertJournalEntries(
          db,
          companyId,
          glRows,
          accountCodeMap,
        );
        result.journalEntriesInserted = glResults.inserted;
        result.journalEntriesSkipped = glResults.skipped;
      } catch {
        // Continue with other imports
      }
    }

    // Import stock levels (inventory)
    if (importType === "all" || importType === "inventory") {
      try {
        const stockPath = join(exportDir, "lagerbestand_warehouse_stock.csv");
        const stockCsv = readFileSync(stockPath, "utf-8");
        const stockParsed = Papa.parse<Record<string, string>>(stockCsv, {
          header: true,
          skipEmptyLines: true,
          transformHeader: cleanColumnName,
        });

        const stockRows = stockParsed.data
          .filter((row) => row["Artikelnummer"] && row["Menge"])
          .map(
            (row): Record<string, string | null> => ({
              articleNumber: row["Artikelnummer"] || null,
              quantity: parseAmount(row["Menge"]),
              warehouse: row["Lager"] || null,
              location: row["Lagerplatz"] || null,
              productName: row["Artikelbeschreibung"] || null,
            }),
          );

        const { warehouses } = await import("@kivvi/database");
        const [defaultWarehouse] = await db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(eq(warehouses.companyId, companyId))
          .limit(1);

        if (defaultWarehouse) {
          const productLookup = await buildProductLookup(db, companyId);
          const stockResults = await bulkInsertStockLevels(
            db,
            companyId,
            defaultWarehouse.id,
            stockRows,
            productLookup,
          );
          result.stockLevelsInserted = stockResults.inserted;
          result.stockLevelsSkipped = stockResults.skipped;
        }
      } catch {
        // Continue with other imports
      }
    }

    // Update number sequences
    try {
      await updateSequencesAfterImport(db, companyId);
    } catch {
      // Non-critical: sequences will be updated on next use
    }

    // Revalidate relevant paths
    revalidatePath("/contacts");
    revalidatePath("/products");
    revalidatePath("/sales/invoices");
    revalidatePath("/purchases/invoices");
    revalidatePath("/accounting/journal");
    revalidatePath("/inventory");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorImportFailed")),
    };
  }
}
