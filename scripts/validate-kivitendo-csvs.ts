/**
 * Validates all kivitendo CSV exports against import mapping profiles.
 * Reports: record counts, auto-detection results, data quality issues.
 *
 * Usage: npx tsx scripts/validate-kivitendo-csvs.ts
 */
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import {
  detectMappingProfile,
  cleanHeaders,
  parseSwissDate,
  parseSwissNumber,
  parseKivitendoLineItems,
  isSubtotalRow,
} from "../packages/core/src/domain/import-mappings";

const EXPORT_DIR = path.join(__dirname, "../kivitendo-export");

interface ValidationResult {
  file: string;
  totalRows: number;
  dataRows: number;
  subtotalRows: number;
  profileDetected: string | null;
  entityType: string | null;
  issues: string[];
  sample: Record<string, string>;
}

const results: ValidationResult[] = [];

// CSV files mapped to their expected entity types
const CSV_FILES: Array<{ file: string; entityType: string; keyColumn?: string }> = [
  { file: "kunden_customers.csv", entityType: "customer", keyColumn: "Firma / Kundenname" },
  { file: "lieferanten_vendors.csv", entityType: "vendor", keyColumn: "Lieferantenname" },
  { file: "artikel_products.csv", entityType: "product", keyColumn: "Artikelnummer" },
  { file: "rechnungen_ar_invoices.csv", entityType: "invoice", keyColumn: "Rechnung" },
  {
    file: "einkaufsrechnungen_ap_invoices.csv",
    entityType: "purchase_invoice",
    keyColumn: "Rechnung",
  },
  { file: "buchungsjournal_gl.csv", entityType: "journal_entry", keyColumn: "Buchungsnummer" },
  { file: "projekte_projects.csv", entityType: "project", keyColumn: "Projektnummer" },
  { file: "lagerbestand_warehouse_stock.csv", entityType: "stock", keyColumn: "Artikelnummer" },
  { file: "auftraege_sales_orders.csv", entityType: "order" },
  { file: "angebote_quotes.csv", entityType: "quote" },
  { file: "lieferscheine_delivery_notes.csv", entityType: "delivery_note" },
];

function validateFile(csvConfig: {
  file: string;
  entityType: string;
  keyColumn?: string;
}): ValidationResult {
  const filePath = path.join(EXPORT_DIR, csvConfig.file);

  if (!fs.existsSync(filePath)) {
    return {
      file: csvConfig.file,
      totalRows: 0,
      dataRows: 0,
      subtotalRows: 0,
      profileDetected: null,
      entityType: csvConfig.entityType,
      issues: ["FILE NOT FOUND"],
      sample: {},
    };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse(raw, { header: false, skipEmptyLines: true });
  const rows = parsed.data as string[][];

  if (rows.length === 0) {
    return {
      file: csvConfig.file,
      totalRows: 0,
      dataRows: 0,
      subtotalRows: 0,
      profileDetected: null,
      entityType: csvConfig.entityType,
      issues: ["EMPTY FILE"],
      sample: {},
    };
  }

  // Clean headers
  const rawHeaders = rows[0];
  const headers = cleanHeaders(rawHeaders);

  // Auto-detect mapping profile
  const profile = detectMappingProfile(headers, csvConfig.entityType);

  // Count data vs subtotal rows
  const dataRows = rows.slice(1);
  let subtotalCount = 0;
  let validCount = 0;
  const issues: string[] = [];

  // Track data quality
  let emptyNames = 0;
  let badDates = 0;
  let badNumbers = 0;
  let negativeAmounts = 0;
  let lineItemRows = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Check for sub-header rows (repeated header pattern)
    if (row[0] === rawHeaders[0] || row[0] === "Position") {
      subtotalCount++;
      continue;
    }

    // Check for subtotal rows using key column
    if (csvConfig.keyColumn) {
      const keyIdx = headers.indexOf(csvConfig.keyColumn);
      if (keyIdx >= 0) {
        const keyVal = row[keyIdx]?.trim();
        if (!keyVal) {
          subtotalCount++;
          continue;
        }
      }
    }

    validCount++;

    // Validate dates
    if (profile) {
      for (const field of profile.fields) {
        if (field.transform === "swissDate") {
          const colIdx = headers.indexOf(field.sourceColumn);
          if (colIdx >= 0) {
            const val = row[colIdx]?.trim();
            if (val && !parseSwissDate(val)) {
              badDates++;
              if (badDates <= 3) {
                issues.push(`Bad date at row ${i + 2}: "${val}" in column "${field.sourceColumn}"`);
              }
            }
          }
        }
        if (field.transform === "swissNumber") {
          const colIdx = headers.indexOf(field.sourceColumn);
          if (colIdx >= 0) {
            const val = row[colIdx]?.trim();
            if (val && !parseSwissNumber(val)) {
              badNumbers++;
              if (badNumbers <= 3) {
                issues.push(
                  `Bad number at row ${i + 2}: "${val}" in column "${field.sourceColumn}"`,
                );
              }
            }
          }
        }
      }
    }

    // Check for line items in document CSVs
    if (
      ["invoice", "purchase_invoice", "order", "quote", "delivery_note"].includes(
        csvConfig.entityType,
      )
    ) {
      const posIdx = headers.indexOf("Positionen");
      if (posIdx >= 0 && row.length > posIdx + 5) {
        const items = parseKivitendoLineItems(row, posIdx);
        if (items.length > 0) lineItemRows++;
      }
    }

    // Check for negative amounts (AP invoices)
    if (csvConfig.entityType === "purchase_invoice") {
      const summeIdx = headers.indexOf("Summe");
      if (summeIdx >= 0) {
        const val = row[summeIdx]?.trim()?.replace(/'/g, "");
        if (val && parseFloat(val) < 0) negativeAmounts++;
      }
    }
  }

  if (badDates > 3) issues.push(`... and ${badDates - 3} more bad dates`);
  if (badNumbers > 3) issues.push(`... and ${badNumbers - 3} more bad numbers`);
  if (negativeAmounts > 0)
    issues.push(`${negativeAmounts} rows with negative amounts (will be converted to positive)`);
  if (lineItemRows > 0)
    issues.push(`${lineItemRows}/${validCount} rows have structured line items`);
  if (!profile)
    issues.push(`No auto-detection profile matched for entity type "${csvConfig.entityType}"`);

  // Build sample from first data row
  const sample: Record<string, string> = {};
  if (dataRows.length > 0) {
    const firstData =
      dataRows.find((r, i) => {
        if (r[0] === rawHeaders[0] || r[0] === "Position") return false;
        if (csvConfig.keyColumn) {
          const ki = headers.indexOf(csvConfig.keyColumn);
          if (ki >= 0 && !r[ki]?.trim()) return false;
        }
        return true;
      }) || dataRows[0];

    for (let j = 0; j < Math.min(headers.length, 10); j++) {
      if (headers[j]) sample[headers[j]] = firstData[j] || "";
    }
  }

  return {
    file: csvConfig.file,
    totalRows: dataRows.length,
    dataRows: validCount,
    subtotalRows: subtotalCount,
    profileDetected: profile ? profile.name : null,
    entityType: csvConfig.entityType,
    issues,
    sample,
  };
}

// Run validation
console.log("=".repeat(80));
console.log("KIVITENDO CSV VALIDATION REPORT");
console.log("=".repeat(80));
console.log();

for (const csv of CSV_FILES) {
  const result = validateFile(csv);
  results.push(result);

  const status = result.profileDetected ? "✓" : "⚠";
  console.log(`${status} ${result.file}`);
  console.log(`  Entity: ${result.entityType}`);
  console.log(
    `  Rows: ${result.dataRows} data + ${result.subtotalRows} subtotal/header = ${result.totalRows} total`,
  );
  console.log(`  Profile: ${result.profileDetected || "NONE (uses column-index import)"}`);

  if (result.issues.length > 0) {
    console.log(`  Issues:`);
    for (const issue of result.issues) {
      console.log(`    - ${issue}`);
    }
  }
  console.log();
}

// Summary
console.log("=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));

const totalRecords = results.reduce((sum, r) => sum + r.dataRows, 0);
const withProfile = results.filter((r) => r.profileDetected).length;
const withIssues = results.filter((r) =>
  r.issues.some((i) => i.startsWith("Bad") || i === "FILE NOT FOUND"),
).length;

console.log(`Total files: ${results.length}`);
console.log(`Total records: ${totalRecords}`);
console.log(`Auto-detected profiles: ${withProfile}/${results.length}`);
console.log(`Files with data issues: ${withIssues}`);
console.log();

// Import order reminder
console.log("IMPORT ORDER (FK dependencies):");
console.log("  1. Customers (no deps)");
console.log("  2. Vendors (no deps)");
console.log("  3. Products → product groups + manufacturers");
console.log("  4. Projects (no deps)");
console.log("  5. AR Invoices → contacts");
console.log("  6. AP Invoices → contacts");
console.log("  7. Sales Orders → contacts");
console.log("  8. Quotes → contacts");
console.log("  9. Delivery Notes → contacts");
console.log("  10. Journal Entries → accounts");
console.log("  11. Stock Levels → products + warehouse");
console.log("  12. Update Number Sequences");
