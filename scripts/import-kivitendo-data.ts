#!/usr/bin/env tsx
/**
 * Import Revamp IT data from Kivitendo CSV exports
 * Usage: pnpm tsx scripts/import-kivitendo-data.ts
 */

import { createPostgresClient } from '@kivvi/database';
import { parseFile } from 'fast-csv';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  bulkInsertContacts,
  bulkInsertProducts,
  bulkInsertDocuments,
  updateSequencesAfterImport,
} from '@kivvi/core/src/domain/import-bulk';
import {
  detectMappingProfile,
  applyMapping,
  cleanHeaders,
} from '@kivvi/core/src/domain/import-mappings';

const KIVITENDO_EXPORT_DIR = '/home/g/kivitendo-export';
const COMPANY_ID = process.env.COMPANY_ID || '';

if (!COMPANY_ID) {
  console.error('❌ COMPANY_ID environment variable required');
  process.exit(1);
}

const db = createPostgresClient(process.env.DATABASE_URL!);

interface CSVRow {
  [key: string]: string;
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CSVRow[] = [];
    parseFile(filePath, { headers: true, delimiter: ',' })
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function importCustomers() {
  console.log('📦 Importing customers...');
  const filePath = join(KIVITENDO_EXPORT_DIR, 'kunden_customers.csv');
  const rows = await parseCSV(filePath);

  const profile = detectMappingProfile(Object.keys(rows[0] || {}));
  if (!profile || profile.entityType !== 'contact') {
    throw new Error('Could not detect customer mapping profile');
  }

  const mapped = rows.map(row => applyMapping(row, profile));
  const result = await bulkInsertContacts(db, COMPANY_ID, mapped);

  console.log(`  ✅ Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log(`  ⚠️  Errors: ${result.errors.slice(0, 5).join(', ')}`);
  }

  return result;
}

async function importProducts() {
  console.log('📦 Importing products...');
  const filePath = join(KIVITENDO_EXPORT_DIR, 'artikel_products.csv');
  const rows = await parseCSV(filePath);

  const profile = detectMappingProfile(Object.keys(rows[0] || {}));
  if (!profile || profile.entityType !== 'product') {
    throw new Error('Could not detect product mapping profile');
  }

  const mapped = rows.map(row => applyMapping(row, profile));
  const result = await bulkInsertProducts(db, COMPANY_ID, mapped);

  console.log(`  ✅ Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log(`  ⚠️  Errors: ${result.errors.slice(0, 5).join(', ')}`);
  }

  return result;
}

async function importInvoices() {
  console.log('📦 Importing invoices...');
  const filePath = join(KIVITENDO_EXPORT_DIR, 'rechnungen_ar_invoices.csv');
  const rows = await parseCSV(filePath);

  const profile = detectMappingProfile(Object.keys(rows[0] || {}));
  if (!profile) {
    throw new Error('Could not detect invoice mapping profile');
  }

  const mapped = rows.map(row => applyMapping(row, profile));
  const result = await bulkInsertDocuments(db, COMPANY_ID, 'admin-user-id', mapped, 'invoice');

  console.log(`  ✅ Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log(`  ⚠️  Errors: ${result.errors.slice(0, 5).join(', ')}`);
  }

  return result;
}

async function main() {
  console.log('🚀 Starting Kivitendo data import for Revamp IT');
  console.log(`   Company ID: ${COMPANY_ID}`);
  console.log(`   Source: ${KIVITENDO_EXPORT_DIR}\n`);

  try {
    // Import in order (FK dependencies)
    await importCustomers();
    await importProducts();
    await importInvoices();

    // Update number sequences to max + 1
    console.log('\n📊 Updating number sequences...');
    await updateSequencesAfterImport(db, COMPANY_ID);
    console.log('  ✅ Number sequences updated\n');

    console.log('✅ Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

main();
