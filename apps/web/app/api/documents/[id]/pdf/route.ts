import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import type { CompanySettings } from '@kivvi/database';
import { getDocument } from '@kivvi/core';
import { generateInvoicePdf } from '@kivvi/core/src/domain/pdf-generation';
import { buildInvoicePdfData } from '@/lib/pdf/build-pdf-data';
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

  const pdfData = buildInvoicePdfData(doc, {
    ...company,
    settings: (company.settings as CompanySettings) ?? {},
  });

  const pdf = await generateInvoicePdf(pdfData);

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${doc.number}.pdf"`,
    },
  });
}
