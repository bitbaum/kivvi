'use server';

import { db } from '@/lib/db';
import { searchContacts, searchProducts, listDocuments } from '@kivvi/core';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

export interface GlobalSearchResults {
  contacts: { id: string; name: string; contactNumber: string | null; email: string | null; type: string }[];
  products: { id: string; name: string; articleNumber: string | null }[];
  documents: { id: string; number: string | null; type: string; status: string; contactName: string | null }[];
}

export async function globalSearchAction(
  query: string
): Promise<ActionResult<GlobalSearchResults>> {
  try {
    const { companyId } = await getSession();

    if (!query || query.trim().length < 2) {
      return { success: true, data: { contacts: [], products: [], documents: [] } };
    }

    const [contacts, products, docs] = await Promise.all([
      searchContacts(db, companyId, query),
      searchProducts(db, companyId, query),
      listDocuments(db, companyId, { search: query, pageSize: 10 }),
    ]);

    return {
      success: true,
      data: {
        contacts: contacts.map((c) => ({
          id: c.id,
          name: c.name,
          contactNumber: c.contactNumber,
          email: c.email,
          type: c.type,
        })),
        products: products.slice(0, 10).map((p) => ({
          id: p.id,
          name: p.name,
          articleNumber: p.articleNumber,
        })),
        documents: docs.data.map((d) => ({
          id: d.id,
          number: d.number,
          type: d.type,
          status: d.status,
          contactName: d.contact?.name ?? null,
        })),
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Search failed') };
  }
}
