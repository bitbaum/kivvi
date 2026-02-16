#!/usr/bin/env tsx
/**
 * Import real Revamp IT data from Kivitendo exports
 * Run with: pnpm tsx scripts/import-real-data.mjs
 */

import { createPostgresClient, contacts, products } from '@kivvi/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';
import { eq, and } from 'drizzle-orm';

const KIVITENDO_EXPORT_DIR = '/home/g/kivitendo-export';
const COMPANY_ID = 'f1e323f2-b1b6-4329-aaeb-642d0a90351f';

const db = createPostgresClient(process.env.DATABASE_URL);

function stripBom(str) {
  return str.replace(/^\uFEFF/, '');
}

function cleanColumnName(name) {
  return stripBom(name).trim().replace(/"/g, '');
}

async function importCustomers() {
  console.log('\n📦 Importing customers from Kivitendo...');

  const filePath = join(KIVITENDO_EXPORT_DIR, 'kunden_customers.csv');
  const csvContent = readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: cleanColumnName,
  });

  console.log(`   Found ${parsed.data.length} customer records`);
  console.log(`   Sample columns: ${Object.keys(parsed.data[0] || {}).slice(0, 5).join(', ')}`);

  let inserted = 0;
  let skipped = 0;
  const errors = [];

  // Import in batches of 100
  for (let i = 0; i < Math.min(parsed.data.length, 500); i++) {
    const row = parsed.data[i];

    try {
      // Map Kivitendo columns to Kivvi format
      const customerNumber = row['Nummer'];
      const name = row['Firma / Kundenname'];

      if (!customerNumber || !name) {
        skipped++;
        continue;
      }

      // Check if already exists
      const existing = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.companyId, COMPANY_ID),
          eq(contacts.contactNumber, customerNumber)
        ),
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Insert new customer
      await db.insert(contacts).values({
        companyId: COMPANY_ID,
        contactNumber: customerNumber,
        name: name,
        email: row['E-Mail'] || null,
        phone: row['Telefon'] || null,
        type: 'customer',
        street: row['Straße'] || null,
        city: row['Stadt'] || null,
        postalCode: row['PLZ'] || null,
        country: row['Land'] || 'CH',
        vatNumber: row['USt-IdNr.'] || null,
        isActive: true,
      });

      inserted++;

      if (inserted % 50 === 0) {
        console.log(`   ✓ Imported ${inserted} customers...`);
      }
    } catch (error) {
      errors.push(`Row ${i}: ${error.message}`);
      if (errors.length < 5) {
        console.error(`   ⚠️  Error on row ${i}:`, error.message);
      }
    }
  }

  console.log(`\n   ✅ Import complete:`);
  console.log(`      Inserted: ${inserted}`);
  console.log(`      Skipped: ${skipped}`);
  console.log(`      Errors: ${errors.length}`);

  return { inserted, skipped, errors };
}

async function importProducts() {
  console.log('\n📦 Importing products from Kivitendo...');

  const filePath = join(KIVITENDO_EXPORT_DIR, 'artikel_products.csv');
  const csvContent = readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: cleanColumnName,
  });

  console.log(`   Found ${parsed.data.length} product records`);

  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < Math.min(parsed.data.length, 500); i++) {
    const row = parsed.data[i];

    try {
      const articleNumber = row['Artikelnummer'];
      const description = row['Artikelbeschreibung'] || row['Beschreibung'];

      if (!articleNumber || !description) {
        skipped++;
        continue;
      }

      // Check if already exists
      const existing = await db.query.products.findFirst({
        where: and(
          eq(products.companyId, COMPANY_ID),
          eq(products.articleNumber, articleNumber)
        ),
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Parse prices (remove apostrophes from Swiss format)
      const parsePrice = (val) => {
        if (!val) return '0';
        return val.replace(/'/g, '');
      };

      const unitPrice = parsePrice(row['Verkaufspreis'] || row['Listenpreis']) || '0';
      const purchasePrice = parsePrice(row['Einkaufspreis']) || '0';

      // Map product type
      const type = row['Typ'] === 'Dienstleistung' ? 'service' : 'product';

      await db.insert(products).values({
        companyId: COMPANY_ID,
        articleNumber: articleNumber,
        description: description,
        type: type,
        unitPrice: unitPrice,
        purchasePrice: purchasePrice,
        unit: 'piece',
        vatRate: '0', // Revamp IT uses 0% VAT
        isActive: true,
      });

      inserted++;

      if (inserted % 50 === 0) {
        console.log(`   ✓ Imported ${inserted} products...`);
      }
    } catch (error) {
      errors.push(`Row ${i}: ${error.message}`);
      if (errors.length < 5) {
        console.error(`   ⚠️  Error on row ${i}:`, error.message);
      }
    }
  }

  console.log(`\n   ✅ Import complete:`);
  console.log(`      Inserted: ${inserted}`);
  console.log(`      Skipped: ${skipped}`);
  console.log(`      Errors: ${errors.length}`);

  return { inserted, skipped, errors };
}

async function main() {
  console.log('🚀 Starting Revamp IT data import from Kivitendo');
  console.log(`   Company ID: ${COMPANY_ID}`);
  console.log(`   Source: ${KIVITENDO_EXPORT_DIR}`);

  try {
    await importCustomers();
    await importProducts();

    console.log('\n✅ Import completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();
