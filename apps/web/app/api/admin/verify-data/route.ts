import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, products, documents } from '@kivvi/database';
import { sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const COMPANY_ID = 'f1e323f2-b1b6-4329-aaeb-642d0a90351f';

    // Count contacts by type
    const allContacts = await (db as any).select()
      .from(contacts)
      .where(eq(contacts.companyId, COMPANY_ID));

    const customers = allContacts.filter((c: any) => c.type === 'customer').length;
    const vendors = allContacts.filter((c: any) => c.type === 'vendor').length;

    // Count products
    const allProducts = await (db as any).select()
      .from(products)
      .where(eq(products.companyId, COMPANY_ID));

    // Count documents by type
    const allDocs = await (db as any).select()
      .from(documents)
      .where(eq(documents.companyId, COMPANY_ID));

    const docCounts: Record<string, number> = {};
    allDocs.forEach((doc: any) => {
      docCounts[doc.type] = (docCounts[doc.type] || 0) + 1;
    });

    // Get sample invoices
    const invoices = allDocs
      .filter((d: any) => d.type === 'invoice')
      .sort((a: any, b: any) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 3)
      .map((inv: any) => ({
        number: inv.number,
        issueDate: inv.issueDate,
        grossAmount: inv.grossAmount
      }));

    return NextResponse.json({
      success: true,
      data: {
        contacts: {
          customers,
          vendors,
          total: allContacts.length
        },
        products: {
          count: allProducts.length
        },
        documents: docCounts,
        totalDocuments: allDocs.length,
        sampleInvoices: invoices
      }
    });
  } catch (error: any) {
    console.error('Verify data error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
