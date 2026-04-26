import { notFound } from "next/navigation";
import { getDocument } from "@kivvi/core";
import type { DocumentType } from "@kivvi/database";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import { DocumentDetail } from "@/components/documents/document-detail";
import { isValidUUID } from "@/lib/utils";

/**
 * Shared loader+renderer for `<type>/[id]/page.tsx` document-detail
 * routes (sales/{quotes,orders,invoices,delivery-notes,credit-notes}/[id],
 *  purchasing/{purchase-orders,purchase-invoices}/[id]).
 *
 * Each page used to repeat: getSessionOrRedirect → validate id →
 * load document → guard the type → render <DocumentDetail>. Centralised
 * here so each page only needs to declare which DocumentType(s) it
 * accepts. Orders accept both "order" and "order_confirmation"; everyone
 * else takes a single type.
 *
 * The 404 guard is important: without it, /sales/quotes/<some-invoice-id>
 * would silently render an invoice under the quotes route. The
 * acceptedTypes check enforces the route ↔ type binding at the
 * server boundary.
 */
export async function renderDocumentDetailPage(
  id: string,
  acceptedTypes: readonly DocumentType[],
) {
  if (!isValidUUID(id)) notFound();
  const session = await getSessionOrRedirect();
  const doc = await getDocument(db, session.user.companyId, id);
  if (!doc || !acceptedTypes.includes(doc.type)) notFound();
  return <DocumentDetail doc={doc} config={DOCUMENT_TYPES[doc.type]} />;
}
