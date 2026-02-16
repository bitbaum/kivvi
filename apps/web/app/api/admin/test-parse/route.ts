import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

function cleanColumnName(name: string) {
  if (!name) return name;
  return name.replace(/\uFEFF/g, '').trim();
}

export async function GET() {
  const KIVITENDO_EXPORT_DIR = '/home/g/kivitendo-export';
  const invoicesPath = join(KIVITENDO_EXPORT_DIR, 'rechnungen_ar_invoices.csv');
  const invoicesCsv = readFileSync(invoicesPath, 'utf-8');

  const invoicesParsed = Papa.parse(invoicesCsv, {
    header: false,
    skipEmptyLines: true,
  });

  const headerRow = invoicesParsed.data[0] as string[];
  const headerMap: Record<string, number> = {};
  headerRow.forEach((col, idx) => {
    const cleaned = cleanColumnName(col);
    if (cleaned) {
      headerMap[cleaned] = idx;
    }
  });

  const invoiceGroups = [];
  let currentInvoice: any = null;
  let currentItems: any[] = [];

  for (let i = 1; i < Math.min(100, invoicesParsed.data.length); i++) {
    const row = invoicesParsed.data[i] as string[];

    if (!row || row.every(cell => !cell)) continue;

    const datum = row[headerMap['Datum']];
    const rechnung = row[headerMap['Rechnung']];

    if (row.length > 40 && datum && rechnung && datum.match(/^\d{2}\.\d{2}\.\d{4}$/) && rechnung.startsWith('R')) {
      if (currentInvoice) {
        invoiceGroups.push({ invoice: currentInvoice, items: currentItems });
      }
      currentInvoice = {};
      headerRow.forEach((col, idx) => {
        const cleaned = cleanColumnName(col);
        if (cleaned) {
          currentInvoice[cleaned] = row[idx];
        }
      });
      currentItems = [];
    }
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
  if (currentInvoice) {
    invoiceGroups.push({ invoice: currentInvoice, items: currentItems });
  }

  return NextResponse.json({
    totalRows: invoicesParsed.data.length,
    headerColumns: Object.keys(headerMap).slice(0, 30),
    invoiceGroupsFound: invoiceGroups.length,
    firstInvoice: invoiceGroups[0] ? {
      number: invoiceGroups[0].invoice.Rechnung,
      date: invoiceGroups[0].invoice.Datum,
      customer: invoiceGroups[0].invoice.Kundennummer,
      itemCount: invoiceGroups[0].items.length,
      firstItem: invoiceGroups[0].items[0]
    } : null,
  });
}
