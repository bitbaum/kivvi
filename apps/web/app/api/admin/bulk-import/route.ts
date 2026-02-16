// @ts-nocheck
/**
 * @deprecated This API route is deprecated.
 * Use Server Action instead: apps/web/app/actions/bulk-import.ts
 *
 * This route remains temporarily for backward compatibility but will be removed.
 * CRITICAL: This route uses direct database operations without proper transactions.
 * All new code should use bulkImportAction() from actions/bulk-import.ts instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import Decimal from 'decimal.js';
import Papa from 'papaparse';
import { contacts, products, documents, documentItems } from '@kivvi/database';
import { eq, and, sql } from 'drizzle-orm';

const KIVITENDO_EXPORT_DIR = '/home/g/kivitendo-export';

function stripBom(str: string) {
  return str.replace(/^\uFEFF/, '');
}

function cleanColumnName(name: string) {
  return stripBom(name).trim().replace(/"/g, '');
}

async function importDocuments(params: {
  filePath: string;
  documentType: string;
  numberColumn: string;
  dateColumn: string;
  customerColumn: string;
  contactsByNumber: Map<string, string>;
  productsByArticle: Map<string, any>;
  companyId: string;
  batchSize: number;
}) {
  const { filePath, documentType, numberColumn, dateColumn, customerColumn, contactsByNumber, productsByArticle, companyId, batchSize } = params;

  const csvContent = readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(csvContent, {
    header: false,
    skipEmptyLines: true,
  });

  // Build header map from first row
  const headerRow = parsed.data[0] as string[];
  const headerMap: Record<string, number> = {};
  headerRow.forEach((col, idx) => {
    const cleaned = cleanColumnName(col);
    if (cleaned) {
      headerMap[cleaned] = idx;
    }
  });

  // Group rows into documents with line items
  const docGroups = [];
  let currentDoc = null;
  let currentItems = [];

  for (let i = 1; i < parsed.data.length; i++) {
    const row = parsed.data[i] as string[];

    // Skip empty rows
    if (!row || row.every(cell => !cell)) continue;

    const datum = row[headerMap[dateColumn]];
    const nummer = row[headerMap[numberColumn]];

    // Detect document row: has many columns and valid date
    if (row.length > 40 && datum && nummer && datum.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      if (currentDoc) {
        docGroups.push({ document: currentDoc, items: currentItems });
      }
      // Store document as object with column names
      currentDoc = {};
      headerRow.forEach((col, idx) => {
        const cleaned = cleanColumnName(col);
        if (cleaned) {
          currentDoc[cleaned] = row[idx];
        }
      });
      currentItems = [];
    }
    // Detect line item row: has 5 columns
    else if (row.length === 5 && row[0] && row[1]) {
      const position = parseInt(row[0]);
      if (!isNaN(position) && position > 0) {
        currentItems.push({
          Position: row[0],
          Artikelnummer: row[1],
          Beschreibung: row[2],
          Menge: row[3],
          Einheit: row[4],
        });
      }
    }
  }
  if (currentDoc) {
    docGroups.push({ document: currentDoc, items: currentItems });
  }

  let inserted = 0;
  let skipped = 0;

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;
    return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
  };

  const parseAmount = (val: string) => {
    if (!val) return '0';
    return val.replace(/'/g, '');
  };

  for (let i = 0; i < Math.min(docGroups.length, batchSize); i++) {
    const { document: row, items } = docGroups[i];

    const docNumber = row[numberColumn];
    if (!docNumber) {
      skipped++;
      continue;
    }

    const existing = await (db as any).query.documents.findFirst({
      where: and(
        eq(documents.companyId, companyId),
        eq(documents.number, docNumber)
      ),
    });

    if (existing) {
      skipped++;
      continue;
    }

    const customerNumber = row[customerColumn];
    const contactId = contactsByNumber.get(customerNumber);
    if (!contactId) {
      skipped++;
      continue;
    }

    const issueDate = parseDate(row[dateColumn]);
    const netAmount = parseAmount(row['Betrag']) || '0';
    const vatAmount = parseAmount(row['Steuer']) || '0';
    const grossAmount = parseAmount(row['Summe']) || '0';

    const [doc] = await (db as any).insert(documents).values({
      companyId,
      type: documentType,
      number: docNumber,
      contactId,
      issueDate,
      status: 'draft',
      netAmount,
      vatAmount,
      grossAmount,
      notes: row['Bemerkungen'] || null,
    }).returning();

    for (const item of items) {
      const articleNumber = item['Artikelnummer'];
      const product = productsByArticle.get(articleNumber);
      const quantityStr = item['Menge'] || '1';
      const description = item['Beschreibung'] || '';
      let unitPrice = '0';
      if (product) {
        unitPrice = product.unitPrice;
      }

      // Calculate total using Decimal.js for exact arithmetic
      const total = new Decimal(unitPrice).times(quantityStr).toFixed(2);

      await (db as any).insert(documentItems).values({
        documentId: doc.id,
        position: parseInt(item['Position'] || '0'),
        productId: product?.id || null,
        description,
        quantity: quantityStr,
        unitPrice,
        discount: '0',
        vatRate: '0',
        unit: item['Einheit'] || 'Stck',
        total,
      });
    }

    inserted++;
  }

  return { inserted, skipped };
}

export async function POST(request: NextRequest) {
  try {
    const { companyId, batchSize = 500, importType = 'all', cleanStart = false } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    // Clean start: delete all existing data for this company
    if (cleanStart) {
      console.log(`Clean start: deleting all existing data for company ${companyId}...`);

      // Use raw SQL for faster bulk deletion
      console.log(`Deleting document items via cascade...`);
      await (db as any).execute(sql`
        DELETE FROM document_items
        WHERE document_id IN (
          SELECT id FROM documents WHERE company_id = ${companyId}
        )
      `);

      console.log(`Deleting documents...`);
      await (db as any).execute(sql`DELETE FROM documents WHERE company_id = ${companyId}`);

      console.log(`Deleting contacts and products...`);
      await (db as any).execute(sql`DELETE FROM contacts WHERE company_id = ${companyId}`);
      await (db as any).execute(sql`DELETE FROM products WHERE company_id = ${companyId}`);

      console.log(`Clean start complete. Starting fresh import...`);
    }

    console.log(`Starting import for company ${companyId}, type: ${importType}`);

    let customersInserted = 0;
    let customersSkipped = 0;
    let productsInserted = 0;
    let productsSkipped = 0;
    let vendorsInserted = 0;
    let vendorsSkipped = 0;
    let invoicesInserted = 0;
    let invoicesSkipped = 0;
    let ordersInserted = 0;
    let ordersSkipped = 0;
    let quotesInserted = 0;
    let quotesSkipped = 0;
    let deliveryNotesInserted = 0;
    let deliveryNotesSkipped = 0;
    let purchaseInvoicesInserted = 0;
    let purchaseInvoicesSkipped = 0;

    // Import customers
    console.log('Importing customers...');
    const customersPath = join(KIVITENDO_EXPORT_DIR, 'kunden_customers.csv');
    const customersCsv = readFileSync(customersPath, 'utf-8');
    const customersParsed = Papa.parse(customersCsv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanColumnName,
    });

    for (let i = 0; i < Math.min(customersParsed.data.length, batchSize); i++) {
      const row: any = customersParsed.data[i];
      const customerNumber = row['Nummer'];
      const name = row['Firma / Kundenname'];

      if (!customerNumber || !name) {
        customersSkipped++;
        continue;
      }

      // Check if exists
      const existing = await (db as any).query.contacts.findFirst({
        where: and(
          eq(contacts.companyId, companyId),
          eq(contacts.contactNumber, customerNumber)
        ),
      });

      if (existing) {
        customersSkipped++;
        continue;
      }

      // Insert
      await (db as any).insert(contacts).values({
        companyId,
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

      customersInserted++;
    }

    // Import products
    console.log('Importing products...');
    const productsPath = join(KIVITENDO_EXPORT_DIR, 'artikel_products.csv');
    const productsCsv = readFileSync(productsPath, 'utf-8');
    const productsParsed = Papa.parse(productsCsv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanColumnName,
    });

    for (let i = 0; i < Math.min(productsParsed.data.length, batchSize); i++) {
      const row: any = productsParsed.data[i];
      const articleNumber = row['Artikelnummer'];
      const description = row['Artikelbeschreibung'] || row['Beschreibung'];

      if (!articleNumber || !description) {
        productsSkipped++;
        continue;
      }

      const existing = await (db as any).query.products.findFirst({
        where: and(
          eq(products.companyId, companyId),
          eq(products.articleNumber, articleNumber)
        ),
      });

      if (existing) {
        productsSkipped++;
        continue;
      }

      const parsePrice = (val: string) => {
        if (!val) return '0';
        return val.replace(/'/g, '');
      };

      const unitPrice = parsePrice(row['Verkaufspreis'] || row['Listenpreis']) || '0';
      const purchasePrice = parsePrice(row['Einkaufspreis']) || '0';
      const type = row['Typ'] === 'Dienstleistung' ? 'service' : 'product';

      await (db as any).insert(products).values({
        companyId,
        articleNumber,
        name: description.substring(0, 100), // Use description as name (truncated)
        description,
        type,
        unitPrice,
        purchasePrice,
        unit: 'piece',
        vatRate: '0',
        isActive: true,
      });

      productsInserted++;
    }

    // Build lookup maps for documents import (needed by invoices, orders, quotes)
    const contactsByNumber = new Map();
    const allContacts = await (db as any).select({
      id: contacts.id,
      contactNumber: contacts.contactNumber
    })
      .from(contacts)
      .where(eq(contacts.companyId, companyId));

    for (const c of allContacts) {
      const rawNumber = c.contactNumber.replace(/\D/g, '');
      if (rawNumber) {
        contactsByNumber.set(rawNumber, c.id);
      }
      contactsByNumber.set(c.contactNumber, c.id);
    }

    const productsByArticle = new Map();
    const allProducts = await (db as any).select({
      id: products.id,
      articleNumber: products.articleNumber,
      unitPrice: products.unitPrice
    })
      .from(products)
      .where(eq(products.companyId, companyId));

    for (const p of allProducts) {
      productsByArticle.set(p.articleNumber, p);
    }

    console.log(`Loaded ${allContacts.length} contacts and ${allProducts.length} products for document import`);

    // Import vendors
    console.log('Importing vendors...');
    const vendorsPath = join(KIVITENDO_EXPORT_DIR, 'lieferanten_vendors.csv');
    const vendorsCsv = readFileSync(vendorsPath, 'utf-8');
    const vendorsParsed = Papa.parse(vendorsCsv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: cleanColumnName,
    });

    for (let i = 0; i < Math.min(vendorsParsed.data.length, batchSize); i++) {
      const row: any = vendorsParsed.data[i];
      const vendorNumber = row['Nummer'];
      const name = row['Lieferantenname'];

      if (!vendorNumber || !name) {
        vendorsSkipped++;
        continue;
      }

      const existing = await (db as any).query.contacts.findFirst({
        where: and(
          eq(contacts.companyId, companyId),
          eq(contacts.contactNumber, vendorNumber)
        ),
      });

      if (existing) {
        vendorsSkipped++;
        continue;
      }

      await (db as any).insert(contacts).values({
        companyId,
        contactNumber: vendorNumber,
        name: name,
        email: row['E-Mail'] || null,
        phone: row['Telefon'] || null,
        type: 'vendor',
        street: row['Straße'] || null,
        city: row['Stadt'] || null,
        postalCode: row['PLZ'] || null,
        country: row['Land'] || 'CH',
        vatNumber: row['USt-IdNr.'] || null,
        isActive: true,
      });

      vendorsInserted++;
    }

    // Import invoices
    if (importType === 'all' || importType === 'invoices') {
      console.log('Importing invoices...');
      const invoicesPath = join(KIVITENDO_EXPORT_DIR, 'rechnungen_ar_invoices.csv');
      const invoicesCsv = readFileSync(invoicesPath, 'utf-8');

      // Parse without headers to handle the complex CSV structure
      const invoicesParsed = Papa.parse(invoicesCsv, {
        header: false,
        skipEmptyLines: true,
      });

      // Build lookup maps for contacts and products
      const contactsByNumber = new Map();
      // Use direct SQL select to avoid any ORM limits
      const allContacts = await (db as any).select({
        id: contacts.id,
        contactNumber: contacts.contactNumber
      })
        .from(contacts)
        .where(eq(contacts.companyId, companyId));

      // Verify total count
      const [{ count: totalContacts }] = await (db as any).select({ count: sql`count(*)::int` })
        .from(contacts)
        .where(eq(contacts.companyId, companyId));

      console.log(`Total contacts in DB: ${totalContacts}, Loaded: ${allContacts.length}`);
      if (allContacts.length > 0) {
        console.log(`Sample contact numbers: ${allContacts.slice(0, 5).map(c => c.contactNumber).join(', ')}`);
      }
      for (const c of allContacts) {
        // Store by the raw number (e.g., "57") extracted from contactNumber (e.g., "K-00057" or just "57")
        const rawNumber = c.contactNumber.replace(/\D/g, '');
        if (rawNumber) {
          contactsByNumber.set(rawNumber, c.id);
        }
        // Also store by the full contactNumber for exact matches
        contactsByNumber.set(c.contactNumber, c.id);
      }

      // Check if some specific low numbers exist in the map
      const testNumbers = ['57', '66', '145', '157', '185', '188'];
      const found = testNumbers.filter(n => contactsByNumber.has(n));
      console.log(`Test lookups - Found: ${found.length}/${testNumbers.length} (${found.join(', ') || 'none'})`);

      const productsByArticle = new Map();
      const allProducts = await (db as any).select({
        id: products.id,
        articleNumber: products.articleNumber,
        unitPrice: products.unitPrice
      })
        .from(products)
        .where(eq(products.companyId, companyId));

      console.log(`Loaded ${allProducts.length} products for lookup`);
      for (const p of allProducts) {
        productsByArticle.set(p.articleNumber, p);
      }

      // Use outer scope variables (declared at line 228) - don't redeclare here

      // Parse invoice structure: each invoice is followed by line item rows
      const invoiceGroups = [];
      let currentInvoice = null;
      let currentItems = [];

      // Build a header map from the first row
      const headerRow = invoicesParsed.data[0] as string[];
      const headerMap: Record<string, number> = {};
      headerRow.forEach((col, idx) => {
        const cleaned = cleanColumnName(col);
        if (cleaned) {
          headerMap[cleaned] = idx;
        }
      });

      console.log(`Invoice CSV columns: ${Object.keys(headerMap).slice(0, 20).join(', ')}`);
      console.log(`Total invoice CSV rows: ${invoicesParsed.data.length}`);

      // Parse invoice and item rows (skip header row)
      for (let i = 1; i < invoicesParsed.data.length; i++) {
        const row = invoicesParsed.data[i] as string[];

        // Skip empty rows
        if (!row || row.every(cell => !cell)) continue;

        // Detect invoice row: has many columns (47) and Datum in DD.MM.YYYY format
        const datum = row[headerMap['Datum']];
        const rechnung = row[headerMap['Rechnung']];

        if (i < 10) {
          console.log(`Row ${i}: length=${row.length}, datum=${datum}, rechnung=${rechnung}, datumMatch=${datum?.match(/^\d{2}\.\d{2}\.\d{4}$/)}, starts with R=${rechnung?.startsWith('R')}`);
        }

        if (row.length > 40 && datum && rechnung && datum.match(/^\d{2}\.\d{2}\.\d{4}$/) && rechnung.startsWith('R')) {
          if (i < 10) console.log(`  -> Detected as INVOICE!`);

          // Save previous invoice if exists
          if (currentInvoice) {
            invoiceGroups.push({ invoice: currentInvoice, items: currentItems });
          }
          // Store invoice as object with column names
          currentInvoice = {};
          headerRow.forEach((col, idx) => {
            const cleaned = cleanColumnName(col);
            if (cleaned) {
              currentInvoice[cleaned] = row[idx];
            }
          });
          currentItems = [];
        }
        // Detect line item row: has 5 columns (Position, Artikelnummer, Beschreibung, Menge, Einheit)
        else if (row.length === 5 && row[0] && row[1]) {
          const position = parseInt(row[0]);
          // Skip header row that says "Position", "Artikelnummer"...
          if (!isNaN(position) && position > 0) {
            currentItems.push({
              Position: row[0],
              Artikelnummer: row[1],
              Beschreibung: row[2],
              Menge: row[3],
              Einheit: row[4],
            });
          }
        }
      }
      // Don't forget the last invoice
      if (currentInvoice) {
        invoiceGroups.push({ invoice: currentInvoice, items: currentItems });
      }

      console.log(`Found ${invoiceGroups.length} invoices with line items`);
      if (invoiceGroups.length > 0) {
        console.log(`First invoice number: ${invoiceGroups[0].invoice['Rechnung']}, items: ${invoiceGroups[0].items.length}`);
      }

      let skippedNoCustomer = 0;
      let skippedAlreadyExists = 0;
      let skippedOther = 0;

      console.log(`Processing up to ${Math.min(invoiceGroups.length, batchSize)} invoices...`);
      // Process invoices (limit by batchSize)
      for (let i = 0; i < Math.min(invoiceGroups.length, batchSize); i++) {
        const { invoice: row, items } = invoiceGroups[i];

        const invoiceNumber = row['Rechnung'];
        if (!invoiceNumber) {
          invoicesSkipped++;
          skippedOther++;
          continue;
        }

        // DEBUG: Log first few invoices to understand item structure
        if (i < 3) {
          console.log(`\n=== Invoice ${invoiceNumber} ===`);
          console.log(`Items count: ${items.length}`);
          if (items.length > 0) {
            console.log('First item keys:', Object.keys(items[0]).filter(k => items[0][k]).slice(0, 15));
            console.log('First item Position:', items[0]['Position']);
            console.log('First item Artikelnummer:', items[0]['Artikelnummer']);
            console.log('First item Beschreibung:', items[0]['Beschreibung']?.substring(0, 80));
          }
        }

        // Check if already exists
        const existing = await (db as any).query.documents.findFirst({
          where: and(
            eq(documents.companyId, companyId),
            eq(documents.number, invoiceNumber)
          ),
        });

        if (existing) {
          invoicesSkipped++;
          skippedAlreadyExists++;
          continue;
        }

        // Map customer
        const customerNumber = row['Kundennummer'];
        const contactId = contactsByNumber.get(customerNumber);
        if (!contactId) {
          if (i < 10) {  // Only log first 10 for debugging
            console.log(`Skipping invoice ${invoiceNumber}: customer ${customerNumber} not found`);
          }
          invoicesSkipped++;
          skippedNoCustomer++;
          continue;
        }

        // Parse date (DD.MM.YYYY → Date object)
        const parseDate = (dateStr: string) => {
          if (!dateStr) return null;
          const parts = dateStr.split('.');
          if (parts.length !== 3) return null;
          // Create Date object from DD.MM.YYYY
          return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        };

        const issueDate = parseDate(row['Datum']);
        const dueDate = parseDate(row['Fälligkeitsdatum']);

        // Parse amounts (remove Swiss apostrophes)
        const parseAmount = (val: string) => {
          if (!val) return '0';
          return val.replace(/'/g, '');
        };

        const netAmount = parseAmount(row['Betrag']) || '0';
        const vatAmount = parseAmount(row['Steuer']) || '0';
        const grossAmount = parseAmount(row['Summe']) || '0';
        const paidAmount = parseAmount(row['bezahlt']) || '0';

        // Determine status using Decimal.js for exact comparison
        let status = 'sent';
        const paidDec = new Decimal(paidAmount);
        const grossDec = new Decimal(grossAmount);
        if (paidDec.greaterThanOrEqualTo(grossDec)) {
          status = 'paid';
        } else if (paidDec.greaterThan(0)) {
          status = 'partially_paid';
        }

        // Insert document
        const [doc] = await (db as any).insert(documents).values({
          companyId,
          type: 'invoice',
          number: invoiceNumber,
          contactId,
          issueDate,
          dueDate,
          status,
          netAmount,
          vatAmount,
          grossAmount,
          notes: row['Bemerkungen'] || null,
        }).returning();

        // Insert line items
        for (const item of items) {
          const articleNumber = item['Artikelnummer'];
          const product = productsByArticle.get(articleNumber);

          const quantityStr = item['Menge'] || '1';
          const description = item['Beschreibung'] || '';

          // Use product price if found, otherwise estimate from totals
          let unitPrice = '0';
          if (product) {
            unitPrice = product.unitPrice;
          }

          // Calculate total using Decimal.js for exact arithmetic
          const total = new Decimal(unitPrice).times(quantityStr).toFixed(2);

          await (db as any).insert(documentItems).values({
            documentId: doc.id,
            position: parseInt(item['Position'] || '0'),
            productId: product?.id || null,
            description,
            quantity: quantityStr,
            unitPrice,
            discount: '0',
            vatRate: '0', // Revamp IT uses 0% VAT
            unit: item['Einheit'] || 'Stck',
            total,
          });
        }

        invoicesInserted++;

        if (invoicesInserted % 50 === 0) {
          console.log(`Imported ${invoicesInserted} invoices...`);
        }
      }

      console.log(`Invoice import complete: ${invoicesInserted} inserted, ${invoicesSkipped} skipped`);
      console.log(`  - No customer found: ${skippedNoCustomer}`);
      console.log(`  - Already exists: ${skippedAlreadyExists}`);
      console.log(`  - Other: ${skippedOther}`);
    }

    // Import sales orders
    if (importType === 'all' || importType === 'orders') {
      console.log('Importing sales orders...');
      const result = await importDocuments({
        filePath: join(KIVITENDO_EXPORT_DIR, 'auftraege_sales_orders.csv'),
        documentType: 'order',
        numberColumn: 'Auftrag',
        dateColumn: 'Datum',
        customerColumn: 'Kundennummer',
        contactsByNumber,
        productsByArticle,
        companyId,
        batchSize,
      });
      ordersInserted = result.inserted;
      ordersSkipped = result.skipped;
      console.log(`Orders import complete: ${ordersInserted} inserted, ${ordersSkipped} skipped`);
    }

    // Import quotes
    if (importType === 'all' || importType === 'quotes') {
      console.log('Importing quotes...');
      const result = await importDocuments({
        filePath: join(KIVITENDO_EXPORT_DIR, 'angebote_quotes.csv'),
        documentType: 'quote',
        numberColumn: 'Angebot',
        dateColumn: 'Datum',
        customerColumn: 'Kundennummer',
        contactsByNumber,
        productsByArticle,
        companyId,
        batchSize,
      });
      quotesInserted = result.inserted;
      quotesSkipped = result.skipped;
      console.log(`Quotes import complete: ${quotesInserted} inserted, ${quotesSkipped} skipped`);
    }

    // Import delivery notes
    if (importType === 'all' || importType === 'delivery_notes') {
      console.log('Importing delivery notes...');
      const result = await importDocuments({
        filePath: join(KIVITENDO_EXPORT_DIR, 'lieferscheine_delivery_notes.csv'),
        documentType: 'delivery_note',
        numberColumn: 'Lieferschein',
        dateColumn: 'Lieferscheindatum',
        customerColumn: 'Kundennummer',
        contactsByNumber,
        productsByArticle,
        companyId,
        batchSize,
      });
      deliveryNotesInserted = result.inserted;
      deliveryNotesSkipped = result.skipped;
      console.log(`Delivery notes import complete: ${deliveryNotesInserted} inserted, ${deliveryNotesSkipped} skipped`);
    }

    // Import purchase invoices (vendor documents)
    if (importType === 'all' || importType === 'purchase_invoices') {
      console.log('Importing purchase invoices...');
      const result = await importDocuments({
        filePath: join(KIVITENDO_EXPORT_DIR, 'einkaufsrechnungen_ap_invoices.csv'),
        documentType: 'purchase_invoice',
        numberColumn: 'Rechnung',
        dateColumn: 'Datum',
        customerColumn: 'Lieferantennummer',
        contactsByNumber,
        productsByArticle,
        companyId,
        batchSize,
      });
      purchaseInvoicesInserted = result.inserted;
      purchaseInvoicesSkipped = result.skipped;
      console.log(`Purchase invoices import complete: ${purchaseInvoicesInserted} inserted, ${purchaseInvoicesSkipped} skipped`);
    }

    return NextResponse.json({
      success: true,
      result: {
        customers: { inserted: customersInserted, skipped: customersSkipped },
        vendors: { inserted: vendorsInserted, skipped: vendorsSkipped },
        products: { inserted: productsInserted, skipped: productsSkipped },
        invoices: importType === 'all' || importType === 'invoices'
          ? { inserted: invoicesInserted, skipped: invoicesSkipped }
          : undefined,
        orders: importType === 'all' || importType === 'orders'
          ? { inserted: ordersInserted, skipped: ordersSkipped }
          : undefined,
        quotes: importType === 'all' || importType === 'quotes'
          ? { inserted: quotesInserted, skipped: quotesSkipped }
          : undefined,
        deliveryNotes: importType === 'all' || importType === 'delivery_notes'
          ? { inserted: deliveryNotesInserted, skipped: deliveryNotesSkipped }
          : undefined,
        purchaseInvoices: importType === 'all' || importType === 'purchase_invoices'
          ? { inserted: purchaseInvoicesInserted, skipped: purchaseInvoicesSkipped }
          : undefined,
      },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}
