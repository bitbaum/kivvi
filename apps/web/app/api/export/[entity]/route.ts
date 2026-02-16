import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Papa from 'papaparse';
import { listContacts, listProducts, listDocuments, listJournalEntries } from '@kivvi/core';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entity } = await params;
  const { searchParams } = new URL(request.url);
  const companyId = session.user.companyId;

  let csvData: string;
  let filename: string;

  switch (entity) {
    case 'contacts': {
      const result = await listContacts(db, companyId, { pageSize: 10000 });
      const rows = result.data.map((c) => ({
        'Kontaktnummer': c.contactNumber || '',
        'Name': c.name,
        'Vorname': c.firstName || '',
        'Nachname': c.lastName || '',
        'Typ': c.type,
        'E-Mail': c.email || '',
        'Telefon': c.phone || '',
        'Mobil': c.mobile || '',
        'Website': c.website || '',
        'Adresse': c.address || '',
        'PLZ': c.postalCode || '',
        'Ort': c.city || '',
        'Land': c.country || '',
        'MWST-Nr': c.vatNumber || '',
        'IBAN': c.iban || '',
        'BIC': c.bic || '',
        'Zahlungsfrist (Tage)': c.paymentTermsDays ?? '',
        'Sprache': c.language || '',
      }));
      csvData = Papa.unparse(rows);
      filename = `kontakte-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }
    case 'products': {
      const result = await listProducts(db, companyId, { pageSize: 10000 });
      const rows = result.data.map((p) => ({
        'Artikelnummer': p.articleNumber || '',
        'Name': p.name,
        'Beschreibung': p.description || '',
        'Typ': p.type,
        'SKU': p.sku || '',
        'EAN': p.ean || '',
        'Preis': p.unitPrice,
        'Einkaufspreis': p.purchasePrice || '',
        'MWST-Satz': p.vatRate,
        'Einheit': p.unit || '',
        'Lagerbestand': p.stockQuantity || '',
        'Mindestbestand': p.minStock ?? '',
        'Währung': p.currency || 'CHF',
      }));
      csvData = Papa.unparse(rows);
      filename = `produkte-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }
    case 'invoices': {
      const type = searchParams.get('type') || 'invoice';
      const result = await listDocuments(db, companyId, {
        type: type as any,
        pageSize: 10000,
      });
      const rows = result.data.map((d) => ({
        'Nummer': d.number,
        'Status': d.status,
        'Datum': d.issueDate ? new Date(d.issueDate).toISOString().split('T')[0] : '',
        'Fälligkeitsdatum': d.dueDate ? new Date(d.dueDate).toISOString().split('T')[0] : '',
        'Kontakt': d.contact?.name || '',
        'Subtotal': d.subtotal,
        'MWST': d.vatAmount,
        'Total': d.total,
        'Währung': d.currency,
      }));
      csvData = Papa.unparse(rows);
      const typeNames: Record<string, string> = {
        invoice: 'rechnungen',
        quote: 'angebote',
        order: 'auftraege',
        credit_note: 'gutschriften',
        delivery_note: 'lieferscheine',
        purchase_order: 'bestellungen',
        purchase_invoice: 'eingangsrechnungen',
      };
      filename = `${typeNames[type] || type}-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }
    case 'journal': {
      const result = await listJournalEntries(db, companyId, { pageSize: 10000 });
      const rows = result.data.map((e) => ({
        'Datum': e.date ? new Date(e.date).toISOString().split('T')[0] : '',
        'Referenz': e.reference || '',
        'Beschreibung': e.description || '',
        'Typ': e.sourceType || 'manual',
      }));
      csvData = Papa.unparse(rows);
      filename = `buchungen-${new Date().toISOString().split('T')[0]}.csv`;
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
  }

  // Add BOM for Excel compatibility with UTF-8
  const bom = '\uFEFF';
  return new Response(bom + csvData, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
