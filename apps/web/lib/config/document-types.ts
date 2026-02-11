import type { DocumentType, DocumentStatus } from '@kivvi/database';

// ============================================================================
// DOCUMENT TYPE CONFIG — SSOT for all document type behavior
// ============================================================================

export interface DocumentTypeConfig {
  type: DocumentType;
  label: string;
  labelPlural: string;
  basePath: string;
  /** Which contact types can be selected (customer for sales, vendor for purchasing) */
  contactFilter: 'customer' | 'vendor' | 'all';
  /** Valid statuses for this document type (subset of all statuses) */
  statuses: DocumentStatus[];
  /** Available status transitions from the UI */
  actions: Partial<Record<DocumentStatus, StatusAction[]>>;
  /** What this document can be converted to */
  conversionTargets: DocumentType[];
  /** Whether this document type has due dates */
  hasDueDate: boolean;
  /** Whether this document type has delivery dates */
  hasDeliveryDate: boolean;
  /** Whether payments can be recorded against this type */
  hasPayments: boolean;
  /** Whether this type can be created directly (false = created via conversion only) */
  canCreate: boolean;
  /** Label for the due/validity date field */
  dueDateLabel: string;
}

export interface StatusAction {
  label: string;
  targetStatus: DocumentStatus;
  variant: 'primary' | 'default' | 'destructive';
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

export const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  dunning_1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  dunning_2: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300',
  dunning_3: 'bg-red-300 text-red-900 dark:bg-red-900/50 dark:text-red-200',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  dunning_1: 'Dunning 1',
  dunning_2: 'Dunning 2',
  dunning_3: 'Dunning 3',
};

// ============================================================================
// DOCUMENT TYPE CONFIGS
// ============================================================================

const COMMON_SALES_ACTIONS: Partial<Record<DocumentStatus, StatusAction[]>> = {
  draft: [
    { label: 'Mark as Sent', targetStatus: 'sent', variant: 'primary' },
    { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
  ],
  sent: [
    { label: 'Confirm', targetStatus: 'confirmed', variant: 'primary' },
    { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
  ],
  confirmed: [
    { label: 'Mark Delivered', targetStatus: 'delivered', variant: 'primary' },
    { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
  ],
  delivered: [
    { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
  ],
  overdue: [
    { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
  ],
};

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  quote: {
    type: 'quote',
    label: 'Quote',
    labelPlural: 'Quotes',
    basePath: '/sales/quotes',
    contactFilter: 'customer',
    statuses: ['draft', 'sent', 'confirmed', 'cancelled'],
    actions: {
      draft: [
        { label: 'Mark as Sent', targetStatus: 'sent', variant: 'primary' },
        { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
      ],
      sent: [
        { label: 'Confirm', targetStatus: 'confirmed', variant: 'primary' },
        { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
      ],
    },
    conversionTargets: ['order', 'invoice'],
    hasDueDate: true,
    hasDeliveryDate: false,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: 'Valid Until',
  },
  order: {
    type: 'order',
    label: 'Order',
    labelPlural: 'Orders',
    basePath: '/sales/orders',
    contactFilter: 'customer',
    statuses: ['draft', 'sent', 'confirmed', 'delivered', 'cancelled'],
    actions: COMMON_SALES_ACTIONS,
    conversionTargets: ['order_confirmation', 'delivery_note', 'invoice'],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: 'Delivery Date',
  },
  order_confirmation: {
    type: 'order_confirmation',
    label: 'Order Confirmation',
    labelPlural: 'Order Confirmations',
    basePath: '/sales/orders',
    contactFilter: 'customer',
    statuses: ['draft', 'sent', 'confirmed', 'cancelled'],
    actions: {
      draft: [
        { label: 'Mark as Sent', targetStatus: 'sent', variant: 'primary' },
      ],
      sent: [
        { label: 'Confirm', targetStatus: 'confirmed', variant: 'primary' },
      ],
    },
    conversionTargets: ['delivery_note', 'invoice'],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: 'Delivery Date',
  },
  delivery_note: {
    type: 'delivery_note',
    label: 'Delivery Note',
    labelPlural: 'Delivery Notes',
    basePath: '/sales/delivery-notes',
    contactFilter: 'customer',
    statuses: ['draft', 'sent', 'delivered', 'cancelled'],
    actions: {
      draft: [
        { label: 'Mark as Sent', targetStatus: 'sent', variant: 'primary' },
      ],
      sent: [
        { label: 'Mark Delivered', targetStatus: 'delivered', variant: 'primary' },
      ],
    },
    conversionTargets: ['invoice'],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: 'Delivery Date',
  },
  invoice: {
    type: 'invoice',
    label: 'Invoice',
    labelPlural: 'Invoices',
    basePath: '/sales/invoices',
    contactFilter: 'customer',
    statuses: ['draft', 'sent', 'confirmed', 'delivered', 'paid', 'partially_paid', 'overdue', 'cancelled', 'dunning_1', 'dunning_2', 'dunning_3'],
    actions: COMMON_SALES_ACTIONS,
    conversionTargets: ['credit_note'],
    hasDueDate: true,
    hasDeliveryDate: false,
    hasPayments: true,
    canCreate: true,
    dueDateLabel: 'Due Date',
  },
  credit_note: {
    type: 'credit_note',
    label: 'Credit Note',
    labelPlural: 'Credit Notes',
    basePath: '/sales/credit-notes',
    contactFilter: 'customer',
    statuses: ['draft', 'sent', 'paid', 'cancelled'],
    actions: {
      draft: [
        { label: 'Mark as Sent', targetStatus: 'sent', variant: 'primary' },
        { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
      ],
      sent: [
        { label: 'Mark as Paid', targetStatus: 'paid', variant: 'primary' },
        { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
      ],
    },
    conversionTargets: [],
    hasDueDate: false,
    hasDeliveryDate: false,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: 'Due Date',
  },
  dunning: {
    type: 'dunning',
    label: 'Dunning',
    labelPlural: 'Dunning',
    basePath: '/sales/dunning',
    contactFilter: 'customer',
    statuses: ['draft', 'sent', 'cancelled'],
    actions: {
      draft: [
        { label: 'Mark as Sent', targetStatus: 'sent', variant: 'primary' },
      ],
    },
    conversionTargets: [],
    hasDueDate: false,
    hasDeliveryDate: false,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: 'Due Date',
  },
  purchase_order: {
    type: 'purchase_order',
    label: 'Purchase Order',
    labelPlural: 'Purchase Orders',
    basePath: '/purchasing/purchase-orders',
    contactFilter: 'vendor',
    statuses: ['draft', 'sent', 'confirmed', 'delivered', 'cancelled'],
    actions: COMMON_SALES_ACTIONS,
    conversionTargets: ['purchase_invoice'],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: 'Expected Delivery',
  },
  purchase_invoice: {
    type: 'purchase_invoice',
    label: 'Purchase Invoice',
    labelPlural: 'Purchase Invoices',
    basePath: '/purchasing/purchase-invoices',
    contactFilter: 'vendor',
    statuses: ['draft', 'confirmed', 'paid', 'partially_paid', 'overdue', 'cancelled'],
    actions: {
      draft: [
        { label: 'Confirm', targetStatus: 'confirmed', variant: 'primary' },
        { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
      ],
      confirmed: [
        { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
      ],
      overdue: [
        { label: 'Cancel', targetStatus: 'cancelled', variant: 'destructive' },
      ],
    },
    conversionTargets: [],
    hasDueDate: true,
    hasDeliveryDate: false,
    hasPayments: true,
    canCreate: true,
    dueDateLabel: 'Due Date',
  },
};

/**
 * Get config for a document type. Returns the config or throws if invalid.
 */
export function getDocumentTypeConfig(type: DocumentType): DocumentTypeConfig {
  const config = DOCUMENT_TYPES[type];
  if (!config) throw new Error(`Unknown document type: ${type}`);
  return config;
}

/**
 * Get the filter status tabs shown on the list page for a document type.
 * Returns the most commonly used statuses for filtering.
 */
export function getFilterStatuses(type: DocumentType): (DocumentStatus | 'all')[] {
  const config = DOCUMENT_TYPES[type];
  const base: (DocumentStatus | 'all')[] = ['all'];

  if (config.statuses.includes('draft')) base.push('draft');
  if (config.statuses.includes('sent')) base.push('sent');
  if (config.statuses.includes('confirmed')) base.push('confirmed');
  if (config.statuses.includes('paid')) base.push('paid');
  if (config.statuses.includes('overdue')) base.push('overdue');
  if (config.statuses.includes('cancelled')) base.push('cancelled');

  return base;
}
