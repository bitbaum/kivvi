import Decimal from "decimal.js";
import { eq, and, sql, desc, lt, gte, lte, inArray } from "drizzle-orm";
import { documents, contacts } from "@kivvi/database";
import type { Database, DocumentType } from "@kivvi/database";

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowSuggestion {
  id: string;
  type:
    | "convert_quote"
    | "invoice_order"
    | "confirm_delivery"
    | "start_dunning";
  priority: number; // 1-5, 1 = highest
  titleKey: string;
  descriptionKey: string;
  descriptionParams?: Record<string, string | number>;
  entityId: string;
  entityNumber: string;
  entityType: DocumentType;
  contactName: string | null;
  amount: number;
  daysSince: number;
  actionLabelKey: string;
  actionUrl: string;
}

// ============================================================================
// WORKFLOW SUGGESTIONS
// ============================================================================

/**
 * Get AI-powered workflow suggestions.
 * Returns recommended next actions based on document states.
 */
export async function getWorkflowSuggestions(
  db: Database,
  companyId: string,
): Promise<WorkflowSuggestion[]> {
  const suggestions: WorkflowSuggestion[] = [];
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // 1. Quotes ready to convert (sent > 3 days ago, within 90-day window)
  const quotesToConvert = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, "quote"),
      inArray(documents.status, ["sent", "confirmed"]),
      lt(documents.issueDate, threeDaysAgo),
      gte(documents.issueDate, ninetyDaysAgo),
      lte(documents.issueDate, now),
    ),
    with: {
      contact: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [desc(documents.issueDate)],
    limit: 10,
  });

  for (const quote of quotesToConvert) {
    const daysSinceSent = Math.floor(
      (now.getTime() - new Date(quote.issueDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    suggestions.push({
      id: `quote-convert-${quote.id}`,
      type: "convert_quote",
      priority: daysSinceSent > 14 ? 1 : daysSinceSent > 7 ? 2 : 3,
      titleKey: "workflow.convertQuoteTitle",
      descriptionKey: "workflow.convertQuoteDesc",
      descriptionParams: { number: quote.number, days: daysSinceSent },
      entityId: quote.id,
      entityNumber: quote.number,
      entityType: "quote",
      contactName: quote.contact?.name || null,
      amount: new Decimal(quote.total || "0").toNumber(),
      daysSince: daysSinceSent,
      actionLabelKey: "workflow.convertQuoteAction",
      actionUrl: `/sales/quotes/${quote.id}`,
    });
  }

  // 2. Orders ready for invoicing (delivered, no invoice exists)
  const ordersToInvoice = await db
    .select({
      order: documents,
      contactName: contacts.name,
      hasInvoice: sql<boolean>`EXISTS(
        SELECT 1 FROM ${documents} inv
        WHERE inv.converted_from_id = ${documents.id}
        AND inv.type = 'invoice'
        AND inv.company_id = ${companyId}
      )`,
    })
    .from(documents)
    .leftJoin(contacts, eq(documents.contactId, contacts.id))
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "order"),
        eq(documents.status, "delivered"),
        gte(documents.issueDate, ninetyDaysAgo),
        lte(documents.issueDate, now),
      ),
    )
    .orderBy(desc(documents.deliveryDate))
    .limit(10);

  for (const row of ordersToInvoice) {
    if (row.hasInvoice) continue; // Skip if invoice already exists

    const order = row.order;
    const daysSinceDelivery = order.deliveryDate
      ? Math.floor(
          (now.getTime() - new Date(order.deliveryDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    suggestions.push({
      id: `order-invoice-${order.id}`,
      type: "invoice_order",
      priority: daysSinceDelivery > 3 ? 1 : 2,
      titleKey: "workflow.invoiceOrderTitle",
      descriptionKey: "workflow.invoiceOrderDesc",
      descriptionParams: { number: order.number, days: daysSinceDelivery },
      entityId: order.id,
      entityNumber: order.number,
      entityType: "order",
      contactName: row.contactName,
      amount: new Decimal(order.total || "0").toNumber(),
      daysSince: daysSinceDelivery,
      actionLabelKey: "workflow.invoiceOrderAction",
      actionUrl: `/sales/orders/${order.id}`,
    });
  }

  // 3. Delivery notes pending confirmation (sent status)
  const deliveryNotesToConfirm = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, "delivery_note"),
      eq(documents.status, "sent"),
      gte(documents.issueDate, ninetyDaysAgo),
      lte(documents.issueDate, now),
    ),
    with: {
      contact: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [desc(documents.issueDate)],
    limit: 10,
  });

  for (const note of deliveryNotesToConfirm) {
    const daysSinceSent = Math.floor(
      (now.getTime() - new Date(note.issueDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    suggestions.push({
      id: `delivery-confirm-${note.id}`,
      type: "confirm_delivery",
      priority: daysSinceSent > 7 ? 2 : 3,
      titleKey: "workflow.confirmDeliveryTitle",
      descriptionKey: "workflow.confirmDeliveryDesc",
      descriptionParams: { number: note.number, days: daysSinceSent },
      entityId: note.id,
      entityNumber: note.number,
      entityType: "delivery_note",
      contactName: note.contact?.name || null,
      amount: new Decimal(note.total || "0").toNumber(),
      daysSince: daysSinceSent,
      actionLabelKey: "workflow.confirmDeliveryAction",
      actionUrl: `/sales/delivery-notes/${note.id}`,
    });
  }

  // 4. Invoices ready for dunning (overdue, no dunning yet)
  const invoicesForDunning = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, "invoice"),
      eq(documents.status, "overdue"),
      sql`${documents.dueDate} < NOW() - INTERVAL '7 days'`,
      gte(documents.dueDate, ninetyDaysAgo),
      lte(documents.dueDate, now),
    ),
    with: {
      contact: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [desc(documents.dueDate)],
    limit: 10,
  });

  for (const invoice of invoicesForDunning) {
    const daysOverdue = invoice.dueDate
      ? Math.floor(
          (now.getTime() - new Date(invoice.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    suggestions.push({
      id: `invoice-dunning-${invoice.id}`,
      type: "start_dunning",
      priority: daysOverdue > 30 ? 1 : daysOverdue > 14 ? 2 : 3,
      titleKey: "workflow.startDunningTitle",
      descriptionKey: "workflow.startDunningDesc",
      descriptionParams: { number: invoice.number, days: daysOverdue },
      entityId: invoice.id,
      entityNumber: invoice.number,
      entityType: "invoice",
      contactName: invoice.contact?.name || null,
      amount: new Decimal(invoice.total || "0").toNumber(),
      daysSince: daysOverdue,
      actionLabelKey: "workflow.startDunningAction",
      actionUrl: `/sales/invoices/${invoice.id}`,
    });
  }

  // Sort by priority (1 = highest)
  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 20);
}
