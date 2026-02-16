import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';
import {
  bulkInsertContacts,
  bulkInsertProducts,
  updateSequencesAfterImport,
} from '@kivvi/core/src/domain/import-bulk';
import { parseSwissDate, parseSwissNumber } from '@kivvi/core/src/domain/import-mappings';
import { eq } from 'drizzle-orm';
import { productGroups as productGroupsSchema, manufacturers as manufacturersSchema } from '@kivvi/database/src/schema';

const KIVITENDO_EXPORT_DIR = '/home/g/kivitendo-export';

export async function POST(request: NextRequest) {
  try {
    const { companyId, entityType } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    console.log(`Starting import for company ${companyId}, entity: ${entityType}`);

    let result;

    if (entityType === 'customers') {
      // Import customers
      const filePath = join(KIVITENDO_EXPORT_DIR, 'kunden_customers.csv');
      const csvContent = readFileSync(filePath, 'utf-8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });
      const records = parsed.data;

      // Map to format expected by bulkInsertContacts
      const mapped = records.slice(0, 100).map((row: any) => ({
        contactNumber: row['Nummer'] || row['Kundennummer'],
        name: row['Firma/Kundenname'] || row['Name'],
        email: row['E-Mail'] || row['Email'],
        phone: row['Telefon'],
        type: 'customer' as const,
        street: row['Strasse'],
        city: row['Stadt'],
        postalCode: row['PLZ'],
        country: row['Land'] || 'CH',
      }));

      result = await bulkInsertContacts(db as any, companyId, mapped);
    } else if (entityType === 'products') {
      // Import products
      const filePath = join(KIVITENDO_EXPORT_DIR, 'artikel_products.csv');
      const csvContent = readFileSync(filePath, 'utf-8');
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });
      const records = parsed.data;

      // Map to format expected by bulkInsertProducts
      const mapped = records.slice(0, 100).map((row: any) => {
        const price = parseSwissNumber(row['Verkaufspreis'] || row['Listenpreis'] || '0');
        return {
          articleNumber: row['Artikelnummer'],
          description: row['Artikelbeschreibung'] || row['Beschreibung'],
          type: row['Typ'] === 'Dienstleistung' ? 'service' : 'product',
          unitPrice: price || '0',
          unit: 'piece',
          vatRate: '0', // Revamp IT uses 0% VAT (nonprofit)
        };
      });

      // Get existing product groups and manufacturers for mapping
      const productGroups = await db.query.productGroups.findMany({
        where: eq(productGroupsSchema.companyId, companyId),
      });
      const manufacturers = await db.query.manufacturers.findMany({
        where: eq(manufacturersSchema.companyId, companyId),
      });

      const productGroupMap = new Map(productGroups.map((g) => [g.name, g.id]));
      const manufacturerMap = new Map(manufacturers.map((m) => [m.name, m.id]));

      result = await bulkInsertProducts(db as any, companyId, mapped, productGroupMap, manufacturerMap);
    } else if (entityType === 'sequences') {
      // Update number sequences
      await updateSequencesAfterImport(db as any, companyId);
      result = { inserted: 0, skipped: 0, errors: [], message: 'Sequences updated' };
    } else {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}
