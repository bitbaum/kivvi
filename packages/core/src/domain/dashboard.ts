import Decimal from 'decimal.js';
import { eq, and, sql, desc, lt, gte, lte, inArray } from 'drizzle-orm';
import {
  documents,
  documentPayments,
  contacts,
  products,
  bankTransactions,
  bankAccounts,
} from '@kivvi/database';
import type { Database, DocumentType } from '@kivvi/database';
import { detectOverdueInvoices } from './dunning';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardAlert {
  id: string;
  type: 'overdue_invoice' | 'expiring_quote' | 'draft_documents' | 'low_stock' | 'unreconciled_transaction';
  severity: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  count?: number;
  amount?: number;
  linkTo: string;
  metadata?: Record<string, any>;
}

export interface WorkflowSuggestion {
  id: string;
  type: 'convert_quote' | 'invoice_order' | 'confirm_delivery' | 'start_dunning';
  priority: number; // 1-5, 1 = highest
  title: string;
  description: string;
  entityId: string;
  entityNumber: string;
  entityType: DocumentType;
  contactName: string | null;
  amount: number;
  daysSince: number;
  actionLabel: string;
  actionUrl: string;
}

export interface ActivityItem {
  id: string;
  type: DocumentType;
  number: string;
  contactName: string | null;
  contactId: string | null;
  amount: number;
  status: string;
  action: string; // Human-readable: "Rechnung erstellt", "Angebot versendet"
  timestamp: Date;
  linkTo: string;
}

export interface DashboardStat {
  label: string;
  value: number;
  count?: number;
  linkTo: string;
  changePercent?: number; // Optional: percent change vs previous period
  type: 'currency' | 'count'; // Determines display format
}

export interface BusinessHealthMetrics {
  profitMargin: number; // Percentage
  conversionRate: number; // Percentage (orders/quotes * 100)
  avgInvoiceValue: number; // CHF
  avgDaysToPayment: number; // Days
  cashFlowRatio: number; // Percentage (inflow/outflow * 100)
  customerRetentionRate: number; // Percentage
}

// ============================================================================
// DASHBOARD ALERTS
// ============================================================================

/**
 * Get all actionable alerts for the dashboard.
 * Returns alerts that require user attention.
 */
export async function getDashboardAlerts(
  db: Database,
  companyId: string
): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];
  const now = new Date();

  // 1. Overdue invoices
  const overdueInvoices = await detectOverdueInvoices(db, companyId);
  if (overdueInvoices.length > 0) {
    const total = overdueInvoices.reduce((sum, inv) => sum.plus(new Decimal(inv.total || '0')), new Decimal(0)).toNumber();
    alerts.push({
      id: 'overdue-invoices',
      type: 'overdue_invoice',
      severity: 'urgent',
      title: 'Überfällige Rechnungen',
      description: `${overdueInvoices.length} Rechnung${overdueInvoices.length === 1 ? '' : 'en'} überfällig`,
      count: overdueInvoices.length,
      amount: total,
      linkTo: '/sales/invoices?status=overdue',
    });
  }

  // 2. Expiring quotes (sent quotes with dueDate within 7 days)
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringQuotes = await db
    .select({
      id: documents.id,
      number: documents.number,
      total: documents.total,
      dueDate: documents.dueDate,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'quote'),
        inArray(documents.status, ['sent', 'confirmed']),
        sql`${documents.dueDate} IS NOT NULL`,
        gte(documents.dueDate, now),
        lte(documents.dueDate, sevenDaysFromNow)
      )
    );

  if (expiringQuotes.length > 0) {
    const total = expiringQuotes.reduce((sum, q) => sum.plus(new Decimal(q.total || '0')), new Decimal(0)).toNumber();
    alerts.push({
      id: 'expiring-quotes',
      type: 'expiring_quote',
      severity: 'warning',
      title: 'Angebote laufen ab',
      description: `${expiringQuotes.length} Angebot${expiringQuotes.length === 1 ? '' : 'e'} läuft in den nächsten 7 Tagen ab`,
      count: expiringQuotes.length,
      amount: total,
      linkTo: '/sales/quotes?status=sent',
    });
  }

  // 3. Draft documents (grouped by type)
  const draftCounts = await db
    .select({
      type: documents.type,
      count: sql<number>`COUNT(*)::int`,
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.status, 'draft')
      )
    )
    .groupBy(documents.type);

  const totalDrafts = draftCounts.reduce((sum, dc) => sum + dc.count, 0);
  if (totalDrafts > 0) {
    const total = draftCounts.reduce((sum, dc) => sum.plus(new Decimal(dc.total || '0')), new Decimal(0)).toNumber();
    const typeBreakdown = draftCounts.map((dc) => `${dc.count} ${dc.type}`).join(', ');
    alerts.push({
      id: 'draft-documents',
      type: 'draft_documents',
      severity: 'info',
      title: 'Entwürfe vorhanden',
      description: `${totalDrafts} Dokument${totalDrafts === 1 ? '' : 'e'} als Entwurf: ${typeBreakdown}`,
      count: totalDrafts,
      amount: total,
      linkTo: '/sales?status=draft',
      metadata: { breakdown: draftCounts },
    });
  }

  // 4. Low stock products (where stockQuantity <= minStock)
  const lowStockProducts = await db
    .select({
      id: products.id,
      name: products.name,
      articleNumber: products.articleNumber,
      stockQuantity: products.stockQuantity,
      minStock: products.minStock,
    })
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        eq(products.isActive, true),
        sql`${products.minStock} IS NOT NULL AND CAST(${products.stockQuantity} AS DECIMAL) <= ${products.minStock}`
      )
    )
    .orderBy(desc(sql`${products.minStock} - CAST(${products.stockQuantity} AS DECIMAL)`))
    .limit(20);

  if (lowStockProducts.length > 0) {
    alerts.push({
      id: 'low-stock',
      type: 'low_stock',
      severity: 'warning',
      title: 'Niedriger Lagerbestand',
      description: `${lowStockProducts.length} Produkt${lowStockProducts.length === 1 ? '' : 'e'} unter Mindestbestand`,
      count: lowStockProducts.length,
      linkTo: '/inventory/products?filter=low-stock',
      metadata: { products: lowStockProducts },
    });
  }

  // 5. Unreconciled bank transactions
  const unreconciledTxns = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      total: sql<string>`COALESCE(SUM(${bankTransactions.amount}::numeric), 0)`,
    })
    .from(bankTransactions)
    .innerJoin(bankAccounts, eq(bankTransactions.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(bankAccounts.companyId, companyId),
        eq(bankTransactions.isReconciled, false)
      )
    );

  const unreconciledCount = unreconciledTxns[0]?.count || 0;
  if (unreconciledCount > 0) {
    alerts.push({
      id: 'unreconciled-transactions',
      type: 'unreconciled_transaction',
      severity: 'info',
      title: 'Nicht abgestimmte Transaktionen',
      description: `${unreconciledCount} Banktransaktion${unreconciledCount === 1 ? '' : 'en'} noch nicht zugeordnet`,
      count: unreconciledCount,
      linkTo: '/banking/transactions?reconciled=false',
    });
  }

  return alerts;
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
  companyId: string
): Promise<WorkflowSuggestion[]> {
  const suggestions: WorkflowSuggestion[] = [];
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // 1. Quotes ready to convert (sent > 3 days ago)
  const quotesToConvert = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, 'quote'),
      inArray(documents.status, ['sent', 'confirmed']),
      lt(documents.issueDate, threeDaysAgo)
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
    const daysSinceSent = Math.floor((now.getTime() - new Date(quote.issueDate).getTime()) / (1000 * 60 * 60 * 24));
    suggestions.push({
      id: `quote-convert-${quote.id}`,
      type: 'convert_quote',
      priority: daysSinceSent > 14 ? 1 : daysSinceSent > 7 ? 2 : 3,
      title: 'Angebot in Auftrag umwandeln',
      description: `Angebot ${quote.number} wurde vor ${daysSinceSent} Tagen versendet`,
      entityId: quote.id,
      entityNumber: quote.number,
      entityType: 'quote',
      contactName: quote.contact?.name || null,
      amount: new Decimal(quote.total || '0').toNumber(),
      daysSince: daysSinceSent,
      actionLabel: 'In Auftrag umwandeln',
      actionUrl: `/sales/quotes/${quote.id}/convert`,
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
        eq(documents.type, 'order'),
        eq(documents.status, 'delivered')
      )
    )
    .orderBy(desc(documents.deliveryDate))
    .limit(10);

  for (const row of ordersToInvoice) {
    if (row.hasInvoice) continue; // Skip if invoice already exists

    const order = row.order;
    const daysSinceDelivery = order.deliveryDate
      ? Math.floor((now.getTime() - new Date(order.deliveryDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    suggestions.push({
      id: `order-invoice-${order.id}`,
      type: 'invoice_order',
      priority: daysSinceDelivery > 3 ? 1 : 2,
      title: 'Auftrag abrechnen',
      description: `Auftrag ${order.number} wurde vor ${daysSinceDelivery} Tagen geliefert`,
      entityId: order.id,
      entityNumber: order.number,
      entityType: 'order',
      contactName: row.contactName,
      amount: new Decimal(order.total || '0').toNumber(),
      daysSince: daysSinceDelivery,
      actionLabel: 'Rechnung erstellen',
      actionUrl: `/sales/orders/${order.id}/convert`,
    });
  }

  // 3. Delivery notes pending confirmation (sent status)
  const deliveryNotesToConfirm = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, 'delivery_note'),
      eq(documents.status, 'sent')
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
    const daysSinceSent = Math.floor((now.getTime() - new Date(note.issueDate).getTime()) / (1000 * 60 * 60 * 24));
    suggestions.push({
      id: `delivery-confirm-${note.id}`,
      type: 'confirm_delivery',
      priority: daysSinceSent > 7 ? 2 : 3,
      title: 'Lieferung bestätigen',
      description: `Lieferschein ${note.number} wurde vor ${daysSinceSent} Tagen versendet`,
      entityId: note.id,
      entityNumber: note.number,
      entityType: 'delivery_note',
      contactName: note.contact?.name || null,
      amount: new Decimal(note.total || '0').toNumber(),
      daysSince: daysSinceSent,
      actionLabel: 'Als geliefert markieren',
      actionUrl: `/sales/delivery-notes/${note.id}`,
    });
  }

  // 4. Invoices ready for dunning (overdue, no dunning yet)
  const invoicesForDunning = await db.query.documents.findMany({
    where: and(
      eq(documents.companyId, companyId),
      eq(documents.type, 'invoice'),
      inArray(documents.status, ['overdue']),
      sql`${documents.dueDate} < NOW() - INTERVAL '7 days'`
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
      ? Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    suggestions.push({
      id: `invoice-dunning-${invoice.id}`,
      type: 'start_dunning',
      priority: daysOverdue > 30 ? 1 : daysOverdue > 14 ? 2 : 3,
      title: 'Mahnung erstellen',
      description: `Rechnung ${invoice.number} ist seit ${daysOverdue} Tagen überfällig`,
      entityId: invoice.id,
      entityNumber: invoice.number,
      entityType: 'invoice',
      contactName: invoice.contact?.name || null,
      amount: new Decimal(invoice.total || '0').toNumber(),
      daysSince: daysOverdue,
      actionLabel: 'Mahnung erstellen',
      actionUrl: `/sales/invoices/${invoice.id}/dunning`,
    });
  }

  // Sort by priority (1 = highest)
  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 20);
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
  limit = 20
): Promise<ActivityItem[]> {
  const recentDocs = await db.query.documents.findMany({
    where: eq(documents.companyId, companyId),
    with: {
      contact: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [desc(documents.updatedAt)],
    limit,
  });

  const typeLabels: Record<DocumentType, string> = {
    quote: 'Angebot',
    order: 'Auftrag',
    order_confirmation: 'Auftragsbestätigung',
    delivery_note: 'Lieferschein',
    invoice: 'Rechnung',
    credit_note: 'Gutschrift',
    purchase_order: 'Bestellung',
    purchase_invoice: 'Eingangsrechnung',
    dunning: 'Mahnung',
  };

  const statusActions: Record<string, string> = {
    draft: 'erstellt',
    sent: 'versendet',
    confirmed: 'bestätigt',
    delivered: 'geliefert',
    paid: 'bezahlt',
    partially_paid: 'teilweise bezahlt',
    overdue: 'überfällig',
    cancelled: 'storniert',
    dunning_1: 'erste Mahnung',
    dunning_2: 'zweite Mahnung',
    dunning_3: 'dritte Mahnung',
  };

  return recentDocs.map((doc) => {
    const typeLabel = typeLabels[doc.type];
    const statusAction = statusActions[doc.status] || doc.status;
    const action = `${typeLabel} ${statusAction}`;

    // Determine link based on document type
    let linkTo = '/sales';
    if (doc.type === 'invoice') linkTo = `/sales/invoices/${doc.id}`;
    else if (doc.type === 'quote') linkTo = `/sales/quotes/${doc.id}`;
    else if (doc.type === 'order') linkTo = `/sales/orders/${doc.id}`;
    else if (doc.type === 'delivery_note') linkTo = `/sales/delivery-notes/${doc.id}`;
    else if (doc.type === 'credit_note') linkTo = `/sales/credit-notes/${doc.id}`;
    else if (doc.type === 'dunning') linkTo = `/sales/dunning/${doc.id}`;
    else if (doc.type === 'purchase_order') linkTo = `/purchases/orders/${doc.id}`;
    else if (doc.type === 'purchase_invoice') linkTo = `/purchases/invoices/${doc.id}`;

    return {
      id: doc.id,
      type: doc.type,
      number: doc.number,
      contactName: doc.contact?.name || null,
      contactId: doc.contact?.id || null,
      amount: new Decimal(doc.total || '0').toNumber(),
      status: doc.status,
      action,
      timestamp: doc.updatedAt,
      linkTo,
    };
  });
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Get enhanced dashboard statistics with links.
 * Returns the same stats as the current dashboard plus linkTo fields.
 */
export async function getDashboardStats(
  db: Database,
  companyId: string
): Promise<{
  revenueThisMonth: DashboardStat;
  revenueThisYear: DashboardStat;
  outstandingInvoices: DashboardStat;
  overdueInvoices: DashboardStat;
  draftDocuments: DashboardStat;
  bankBalance: DashboardStat;
  activeContacts: DashboardStat;
  activeProducts: DashboardStat;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Run all 8 independent queries in parallel
  const [
    [monthlyRevenue],
    [yearlyRevenue],
    [outstanding],
    [overdue],
    [drafts],
    [bankBalance],
    [contactCount],
    [productCount],
  ] = await Promise.all([
    db.select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.type, 'invoice'),
      eq(documents.status, 'paid'), gte(documents.paidDate, startOfMonth)
    )),
    db.select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.type, 'invoice'),
      eq(documents.status, 'paid'), gte(documents.paidDate, startOfYear)
    )),
    db.select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.type, 'invoice'),
      inArray(documents.status, ['sent', 'confirmed', 'delivered', 'partially_paid'])
    )),
    db.select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.type, 'invoice'),
      inArray(documents.status, ['overdue', 'dunning_1', 'dunning_2', 'dunning_3'])
    )),
    db.select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.status, 'draft')
    )),
    db.select({
      total: sql<string>`COALESCE(SUM(${bankAccounts.balance}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(bankAccounts).where(eq(bankAccounts.companyId, companyId)),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(contacts).where(and(
      eq(contacts.companyId, companyId), eq(contacts.isActive, true)
    )),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(products).where(and(
      eq(products.companyId, companyId), eq(products.isActive, true)
    )),
  ]);

  return {
    revenueThisMonth: {
      label: 'Umsatz dieser Monat',
      value: new Decimal(monthlyRevenue?.total || '0').toNumber(),
      count: monthlyRevenue?.count || 0,
      linkTo: '/sales/invoices?status=paid',
      type: 'currency',
    },
    revenueThisYear: {
      label: 'Umsatz dieses Jahr',
      value: new Decimal(yearlyRevenue?.total || '0').toNumber(),
      count: yearlyRevenue?.count || 0,
      linkTo: '/reports/sales',
      type: 'currency',
    },
    outstandingInvoices: {
      label: 'Offene Rechnungen',
      value: new Decimal(outstanding?.total || '0').toNumber(),
      count: outstanding?.count || 0,
      linkTo: '/sales/invoices?status=sent,confirmed,delivered,partially_paid',
      type: 'currency',
    },
    overdueInvoices: {
      label: 'Überfällige Rechnungen',
      value: new Decimal(overdue?.total || '0').toNumber(),
      count: overdue?.count || 0,
      linkTo: '/sales/invoices?status=overdue',
      type: 'currency',
    },
    draftDocuments: {
      label: 'Entwürfe',
      value: new Decimal(drafts?.total || '0').toNumber(),
      count: drafts?.count || 0,
      linkTo: '/sales?status=draft',
      type: 'currency',
    },
    bankBalance: {
      label: 'Kontostand',
      value: new Decimal(bankBalance?.total || '0').toNumber(),
      count: bankBalance?.count || 0,
      linkTo: '/banking/accounts',
      type: 'currency',
    },
    activeContacts: {
      label: 'Aktive Kontakte',
      value: contactCount?.count || 0,
      linkTo: '/contacts',
      type: 'count',
    },
    activeProducts: {
      label: 'Aktive Produkte',
      value: productCount?.count || 0,
      linkTo: '/products',
      type: 'count',
    },
  };
}

// ============================================================================
// BUSINESS HEALTH METRICS
// ============================================================================

/**
 * Calculate business health metrics for dashboard
 * Returns key performance indicators
 */
export async function getBusinessHealthMetrics(
  db: Database,
  companyId: string
): Promise<BusinessHealthMetrics> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
  const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);

  // Run all 5 independent queries in parallel
  const [
    [revenueData],
    [costsData],
    [conversionData],
    [paymentData],
    [lastYearData],
    [thisYearData],
  ] = await Promise.all([
    db.select({
      revenue: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.type, 'invoice'),
      eq(documents.status, 'paid'), gte(documents.paidDate, startOfYear)
    )),
    db.select({
      costs: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.type, 'purchase_invoice'),
      eq(documents.status, 'paid'), gte(documents.paidDate, startOfYear)
    )),
    db.select({
      quotes: sql<number>`COUNT(*) FILTER (WHERE ${documents.type} = 'quote' AND ${documents.status} != 'draft')::int`,
      orders: sql<number>`COUNT(*) FILTER (WHERE ${documents.type} = 'order')::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), gte(documents.issueDate, startOfYear)
    )),
    db.select({
      avgDays: sql<number>`AVG(EXTRACT(DAY FROM (${documents.paidDate}::timestamp - ${documents.issueDate}::timestamp)))::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), eq(documents.type, 'invoice'),
      eq(documents.status, 'paid'), gte(documents.paidDate, startOfYear),
      sql`${documents.paidDate} IS NOT NULL AND ${documents.issueDate} IS NOT NULL`
    )),
    db.select({
      count: sql<number>`COUNT(DISTINCT ${documents.contactId})::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId),
      gte(documents.issueDate, startOfLastYear), lte(documents.issueDate, endOfLastYear),
      sql`${documents.contactId} IS NOT NULL`
    )),
    db.select({
      count: sql<number>`COUNT(DISTINCT ${documents.contactId})::int`,
    }).from(documents).where(and(
      eq(documents.companyId, companyId), gte(documents.issueDate, startOfYear),
      sql`${documents.contactId} IS NOT NULL`
    )),
  ]);

  const revenue = new Decimal(revenueData?.revenue || '0');
  const costs = new Decimal(costsData?.costs || '0');
  const profitMargin = revenue.gt(0) ? revenue.minus(costs).div(revenue).times(100).toNumber() : 0;

  const quotes = conversionData?.quotes || 0;
  const orders = conversionData?.orders || 0;
  const conversionRate = quotes > 0 ? new Decimal(orders).div(quotes).times(100).toNumber() : 0;

  const avgInvoiceValue =
    revenueData && revenueData.count > 0
      ? revenue.div(revenueData.count).toNumber()
      : 0;

  const avgDaysToPayment = paymentData?.avgDays || 0;

  const cashFlowRatio = costs.gt(0) ? revenue.div(costs).times(100).toNumber() : 100;

  const lastYearCustomers = lastYearData?.count || 0;
  const thisYearCustomers = thisYearData?.count || 0;
  const customerRetentionRate =
    lastYearCustomers > 0 ? new Decimal(thisYearCustomers).div(lastYearCustomers).times(100).toNumber() : 0;

  return {
    profitMargin: Math.round(profitMargin * 10) / 10, // Round to 1 decimal
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgInvoiceValue: Math.round(avgInvoiceValue * 100) / 100, // Round to 2 decimals
    avgDaysToPayment,
    cashFlowRatio: Math.round(cashFlowRatio * 10) / 10,
    customerRetentionRate: Math.round(customerRetentionRate * 10) / 10,
  };
}
