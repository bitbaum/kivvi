import Decimal from "decimal.js";
import { eq, desc, and, notInArray, inArray } from "drizzle-orm";
import { documents, inventoryItems, contacts } from "@kivvi/database";
import type { Database, DocumentType } from "@kivvi/database";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityItem {
  id: string;
  entityType: "document" | "inventory_item";
  type: string; // DocumentType for documents; ItemStatusValue for inventory items
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

// Inventory statuses worth surfacing in the activity feed
const ACTIVITY_INVENTORY_STATUSES = [
  "intake",
  "repair",
  "ready_for_sale",
  "listed",
  "sold",
  "donated",
  "recycled",
] as const;

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

/**
 * Get unified activity feed: recent document events + recent inventory item
 * status changes, merged and sorted by recency.
 */
export async function getRecentActivity(
  db: Database,
  companyId: string,
  limit = 20,
): Promise<ActivityItem[]> {
  const [recentDocs, recentItems] = await Promise.all([
    db.query.documents.findMany({
      where: and(
        eq(documents.companyId, companyId),
        // Exclude delivery notes — no financial amount, clutter the feed
        notInArray(documents.type, ["delivery_note"]),
      ),
      with: { contact: { columns: { id: true, name: true } } },
      orderBy: [desc(documents.updatedAt)],
      limit,
    }),
    db.query.inventoryItems.findMany({
      where: and(
        eq(inventoryItems.companyId, companyId),
        inArray(inventoryItems.status, [...ACTIVITY_INVENTORY_STATUSES]),
      ),
      with: {
        donorContact: { columns: { id: true, name: true } },
      },
      orderBy: [desc(inventoryItems.statusUpdatedAt)],
      limit,
    }),
  ]);

  const docItems: ActivityItem[] = recentDocs.map((doc) => {
    let linkTo = "/sales";
    if (doc.type === "invoice") linkTo = `/sales/invoices/${doc.id}`;
    else if (doc.type === "quote") linkTo = `/sales/quotes/${doc.id}`;
    else if (doc.type === "order") linkTo = `/sales/orders/${doc.id}`;
    else if (doc.type === "delivery_note") linkTo = `/sales/delivery-notes/${doc.id}`;
    else if (doc.type === "credit_note") linkTo = `/sales/credit-notes/${doc.id}`;
    else if (doc.type === "dunning") linkTo = `/sales/dunning/${doc.id}`;
    else if (doc.type === "purchase_order") linkTo = `/purchasing/purchase-orders/${doc.id}`;
    else if (doc.type === "purchase_invoice") linkTo = `/purchasing/purchase-invoices/${doc.id}`;

    return {
      id: doc.id,
      entityType: "document",
      type: doc.type as DocumentType,
      number: doc.number,
      contactName: doc.contact?.name ?? null,
      contactId: doc.contact?.id ?? null,
      amount: new Decimal(doc.total || "0").toNumber(),
      status: doc.status,
      actionKey: `activity.${doc.type}.${doc.status}`,
      timestamp: doc.updatedAt,
      linkTo,
    };
  });

  const inventoryActivityItems: ActivityItem[] = recentItems.map((item) => ({
    id: item.id,
    entityType: "inventory_item",
    type: item.status,
    number: item.itemNumber,
    contactName: item.donorContact?.name ?? null,
    contactId: item.donorContact?.id ?? null,
    amount: new Decimal(
      item.soldPrice ?? item.askingPrice ?? item.estimatedValue ?? "0",
    ).toNumber(),
    status: item.status,
    actionKey: `activity.inventory.${item.status}`,
    timestamp: item.statusUpdatedAt,
    linkTo: `/intake/items/${item.id}`,
  }));

  // Merge and sort by recency, return top N
  return [...docItems, ...inventoryActivityItems]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}
