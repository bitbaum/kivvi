import Decimal from "decimal.js";
import { eq, desc, and, notInArray } from "drizzle-orm";
import { documents } from "@kivvi/database";
import type { Database, DocumentType } from "@kivvi/database";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityItem {
  id: string;
  type: DocumentType;
  number: string;
  contactName: string | null;
  contactId: string | null;
  amount: number;
  status: string;
  actionKey: string;
  actionParams?: Record<string, string | number>;
  timestamp: Date;
  linkTo: string;
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

/**
 * Get unified activity feed across all document types.
 * Returns recent document updates with human-readable actions.
 */
export async function getRecentActivity(
  db: Database,
  companyId: string,
  limit = 20,
): Promise<ActivityItem[]> {
  const recentDocs = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      // Exclude delivery notes — they have no financial amount and clutter the feed
      notInArray(documents.type, ["delivery_note"]),
    ),
    with: {
      contact: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [desc(documents.updatedAt)],
    limit,
  });

  return recentDocs.map((doc) => {
    // Construct i18n key: activity.<type>.<status>
    const actionKey = `activity.${doc.type}.${doc.status}`;

    // Determine link based on document type
    let linkTo = "/sales";
    if (doc.type === "invoice") linkTo = `/sales/invoices/${doc.id}`;
    else if (doc.type === "quote") linkTo = `/sales/quotes/${doc.id}`;
    else if (doc.type === "order") linkTo = `/sales/orders/${doc.id}`;
    else if (doc.type === "delivery_note")
      linkTo = `/sales/delivery-notes/${doc.id}`;
    else if (doc.type === "credit_note")
      linkTo = `/sales/credit-notes/${doc.id}`;
    else if (doc.type === "dunning") linkTo = `/sales/dunning/${doc.id}`;
    else if (doc.type === "purchase_order")
      linkTo = `/purchasing/purchase-orders/${doc.id}`;
    else if (doc.type === "purchase_invoice")
      linkTo = `/purchasing/purchase-invoices/${doc.id}`;

    return {
      id: doc.id,
      type: doc.type,
      number: doc.number,
      contactName: doc.contact?.name || null,
      contactId: doc.contact?.id || null,
      amount: new Decimal(doc.total || "0").toNumber(),
      status: doc.status,
      actionKey,
      timestamp: doc.updatedAt,
      linkTo,
    };
  });
}
