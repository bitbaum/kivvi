import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, documents, documentItems } from '@kivvi/database';
import { eq, and, like, or } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { searchTerm, type } = await request.json();
    const COMPANY_ID = 'f1e323f2-b1b6-4329-aaeb-642d0a90351f';

    if (type === 'contacts') {
      // Search contacts by name or number
      const results = await (db as any).select()
        .from(contacts)
        .where(
          and(
            eq(contacts.companyId, COMPANY_ID),
            or(
              like(contacts.name, `%${searchTerm}%`),
              like(contacts.contactNumber, `%${searchTerm}%`)
            )
          )
        )
        .limit(10);

      return NextResponse.json({ success: true, results, count: results.length });
    }

    if (type === 'invoices') {
      // Search invoices by number
      const results = await (db as any).select()
        .from(documents)
        .where(
          and(
            eq(documents.companyId, COMPANY_ID),
            eq(documents.type, 'invoice'),
            like(documents.number, `%${searchTerm}%`)
          )
        )
        .limit(10);

      // Get line items for first invoice
      if (results.length > 0) {
        const items = await (db as any).select()
          .from(documentItems)
          .where(eq(documentItems.documentId, results[0].id))
          .limit(5);

        results[0].items = items;
      }

      return NextResponse.json({ success: true, results, count: results.length });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
