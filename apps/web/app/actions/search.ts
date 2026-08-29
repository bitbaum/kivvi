"use server";

import { searchContacts, searchProducts, listDocuments } from "@kivvi/core";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

export interface GlobalSearchResults {
  contacts: {
    id: string;
    name: string;
    contactNumber: string | null;
    email: string | null;
    type: string;
  }[];
  products: { id: string; name: string; articleNumber: string | null }[];
  documents: {
    id: string;
    number: string | null;
    type: string;
    status: string;
    contactName: string | null;
  }[];
}

export const globalSearchAction = createAction<string, GlobalSearchResults>({
  handler: async (query, { companyId, db }) => {
    if (!query || query.trim().length < 2) {
      return { contacts: [], products: [], documents: [] };
    }

    const [contacts, products, docs] = await Promise.all([
      searchContacts(db, companyId, query),
      searchProducts(db, companyId, query),
      listDocuments(db, companyId, { search: query, pageSize: 10 }),
    ]);

    return {
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
    };
  },
  errorMessage: () => getTranslations("common").then((t) => t("errorSearchFailed")),
});
