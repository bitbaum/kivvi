import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import type { CompanySettings } from '@kivvi/database';
import { getDocument } from '@kivvi/core';
import { generateInvoicePdf } from '@kivvi/core/src/domain/pdf-generation';
import { DEFAULT_VAT_RATE } from '@kivvi/core/src/config/vat-rates';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await getDocument(db, session.user.companyId, id);
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Fetch company info for the PDF header and QR-bill
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const settings = (company.settings as CompanySettings) ?? {};

  // Build InvoicePdfData from document + company
  const pdfData = {
    // Company info
    companyName: company.legalName || company.name,
    companyAddress: company.address || '',
    companyCity: company.city || '',
    companyPostalCode: company.postalCode || '',
    companyCountry: company.country || 'CH',
    companyVatNumber: company.vatNumber || undefined,
    companyIban: settings.bankAccount?.iban || undefined,

    // Document info
    number: doc.number,
    issueDate: doc.issueDate instanceof Date ? doc.issueDate.toISOString() : String(doc.issueDate),
    dueDate: doc.dueDate
      ? (doc.dueDate instanceof Date ? doc.dueDate.toISOString() : String(doc.dueDate))
      : undefined,

    // Contact info
    contactName: doc.contact?.name || '',
    contactAddress: doc.contact?.address || undefined,
    contactCity: doc.contact?.city || undefined,
    contactPostalCode: doc.contact?.postalCode || undefined,
    contactCountry: doc.contact?.country || undefined,

    // Items
    items: (doc.items || []).map((item: any, index: number) => ({
      position: item.position ?? index + 1,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate || DEFAULT_VAT_RATE,
      discount: item.discount || '0',
      total: item.total,
    })),

    // Totals
    subtotal: doc.subtotal,
    vatAmount: doc.vatAmount,
    total: doc.total,
    currency: doc.currency,

    // QR Bill
    qrReference: doc.qrReference || undefined,
    notes: doc.notes || undefined,
  };

  const pdf = await generateInvoicePdf(pdfData);

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${doc.number}.pdf"`,
    },
  });
}
