import type { DocumentType, DocumentStatus } from "@kivvi/database";
import { VALID_CONVERSIONS } from "@kivvi/core/src/domain/document-conversions";

// ============================================================================
// DOCUMENT TYPE CONFIG — SSOT for all document type behavior
// ============================================================================

export interface DocumentTypeConfig {
  type: DocumentType;
  /** Translation key within 'documents' namespace — use t(config.label) */
  label: string;
  /** Translation key within 'documents' namespace — use t(config.labelPlural) */
  labelPlural: string;
  basePath: string;
  /** Which contact types can be selected (customer for sales, vendor for purchasing) */
  contactFilter: "customer" | "vendor" | "all";
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
  /** Translation key within 'documents' namespace for the due/validity date field */
  dueDateLabel: string;
  /** Bulk actions available on the list page */
  bulkActions: BulkActionDef[];
}

export interface StatusAction {
  /** Translation key within 'statusActions' namespace — use t(action.label) */
  label: string;
  targetStatus: DocumentStatus;
  variant: "primary" | "default" | "destructive";
}

export interface BulkActionDef {
  /** Unique identifier, e.g. 'convert_to_invoice' */
  id: string;
  /** Translation key within 'bulkActions' namespace */
  label: string;
  /** Action type — dispatched to the correct server action */
  action:
    | "convert"
    | "status_change"
    | "delete"
    | "extend_validity"
    | "dunning"
    | "mark_paid";
  variant: "default" | "primary" | "destructive";
  /** Only show when all selected docs match one of these statuses */
  applicableStatuses?: DocumentStatus[];
  /** Target document type for convert actions */
  targetType?: DocumentType;
  /** Target status for status_change actions */
  targetStatus?: DocumentStatus;
  /** Show confirmation dialog before executing */
  requiresConfirmation?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Common status filter tabs shown on the documents hub page */
export const COMMON_FILTER_STATUSES: DocumentStatus[] = [
  "draft",
  "sent",
  "confirmed",
  "paid",
  "overdue",
  "cancelled",
];

/** Statuses that indicate an invoice is overdue-eligible (sent but unpaid) */
export const OVERDUE_ELIGIBLE_STATUSES: DocumentStatus[] = [
  "sent",
  "partially_paid",
];

/** Default payment terms for new documents (in days) */
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/** Default page size for list views */
export const DEFAULT_PAGE_SIZE = 25;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert snake_case DB values to camelCase translation keys.
 * e.g., 'partially_paid' → 'partiallyPaid', 'dunning_1' → 'dunning1'
 */
export function toCamelCase(snakeCase: string): string {
  return snakeCase.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

export const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delivered:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  partially_paid:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  dunning_1: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  dunning_2: "bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300",
  dunning_3: "bg-red-300 text-red-900 dark:bg-red-900/50 dark:text-red-200",
};

// Status labels are in translation files under the 'status' namespace.
// Usage: t(toCamelCase(status)) where t = useTranslations('status') or getTranslations('status')

// ============================================================================
// DOCUMENT TYPE CONFIGS
// ============================================================================

const COMMON_SALES_ACTIONS: Partial<Record<DocumentStatus, StatusAction[]>> = {
  draft: [
    { label: "markAsSent", targetStatus: "sent", variant: "primary" },
    { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
  ],
  sent: [
    { label: "confirm", targetStatus: "confirmed", variant: "primary" },
    { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
  ],
  confirmed: [
    { label: "markDelivered", targetStatus: "delivered", variant: "primary" },
    { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
  ],
  delivered: [
    { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
  ],
  overdue: [
    { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
  ],
};

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  quote: {
    type: "quote",
    label: "quote",
    labelPlural: "quotePlural",
    basePath: "/sales/quotes",
    contactFilter: "customer",
    statuses: ["draft", "sent", "confirmed", "cancelled"],
    actions: {
      draft: [
        { label: "markAsSent", targetStatus: "sent", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
      sent: [
        { label: "confirm", targetStatus: "confirmed", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
    },
    conversionTargets: VALID_CONVERSIONS.quote ?? [],
    hasDueDate: true,
    hasDeliveryDate: false,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: "validUntil",
    bulkActions: [
      {
        id: "convert_to_order",
        label: "convertToOrder",
        action: "convert",
        variant: "default",
        targetType: "order",
      },
      {
        id: "convert_to_invoice",
        label: "convertToInvoice",
        action: "convert",
        variant: "primary",
        targetType: "invoice",
      },
      {
        id: "extend_validity",
        label: "extendValidity",
        action: "extend_validity",
        variant: "default",
      },
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  order: {
    type: "order",
    label: "order",
    labelPlural: "orderPlural",
    basePath: "/sales/orders",
    contactFilter: "customer",
    statuses: ["draft", "sent", "confirmed", "delivered", "cancelled"],
    actions: COMMON_SALES_ACTIONS,
    conversionTargets: VALID_CONVERSIONS.order ?? [],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: "deliveryDate",
    bulkActions: [
      {
        id: "convert_to_invoice",
        label: "convertToInvoice",
        action: "convert",
        variant: "primary",
        targetType: "invoice",
      },
      {
        id: "convert_to_delivery_note",
        label: "convertToDeliveryNote",
        action: "convert",
        variant: "default",
        targetType: "delivery_note",
      },
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  order_confirmation: {
    type: "order_confirmation",
    label: "orderConfirmation",
    labelPlural: "orderConfirmationPlural",
    basePath: "/sales/orders",
    contactFilter: "customer",
    statuses: ["draft", "sent", "confirmed", "cancelled"],
    actions: {
      draft: [
        { label: "markAsSent", targetStatus: "sent", variant: "primary" },
      ],
      sent: [
        { label: "confirm", targetStatus: "confirmed", variant: "primary" },
      ],
    },
    conversionTargets: VALID_CONVERSIONS.order_confirmation ?? [],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: "deliveryDate",
    bulkActions: [
      {
        id: "convert_to_invoice",
        label: "convertToInvoice",
        action: "convert",
        variant: "primary",
        targetType: "invoice",
      },
      {
        id: "convert_to_delivery_note",
        label: "convertToDeliveryNote",
        action: "convert",
        variant: "default",
        targetType: "delivery_note",
      },
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  delivery_note: {
    type: "delivery_note",
    label: "deliveryNote",
    labelPlural: "deliveryNotePlural",
    basePath: "/sales/delivery-notes",
    contactFilter: "customer",
    statuses: ["draft", "sent", "delivered", "cancelled"],
    actions: {
      draft: [
        { label: "markAsSent", targetStatus: "sent", variant: "primary" },
      ],
      sent: [
        {
          label: "markDelivered",
          targetStatus: "delivered",
          variant: "primary",
        },
      ],
    },
    conversionTargets: VALID_CONVERSIONS.delivery_note ?? [],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: "deliveryDate",
    bulkActions: [
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
      {
        id: "mark_delivered",
        label: "markDelivered",
        action: "status_change",
        variant: "primary",
        targetStatus: "delivered",
        applicableStatuses: ["sent"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  invoice: {
    type: "invoice",
    label: "invoice",
    labelPlural: "invoicePlural",
    basePath: "/sales/invoices",
    contactFilter: "customer",
    statuses: [
      "draft",
      "sent",
      "confirmed",
      "delivered",
      "paid",
      "partially_paid",
      "overdue",
      "cancelled",
      "dunning_1",
      "dunning_2",
      "dunning_3",
    ],
    actions: COMMON_SALES_ACTIONS,
    conversionTargets: VALID_CONVERSIONS.invoice ?? [],
    hasDueDate: true,
    hasDeliveryDate: false,
    hasPayments: true,
    canCreate: true,
    dueDateLabel: "dueDate",
    bulkActions: [
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
      {
        id: "mark_paid",
        label: "markAsPaid",
        action: "mark_paid",
        variant: "primary",
        applicableStatuses: [
          "sent",
          "confirmed",
          "delivered",
          "partially_paid",
          "overdue",
          "dunning_1",
          "dunning_2",
          "dunning_3",
        ],
      },
      {
        id: "convert_to_credit_note",
        label: "convertToCreditNote",
        action: "convert",
        variant: "default",
        targetType: "credit_note",
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  credit_note: {
    type: "credit_note",
    label: "creditNote",
    labelPlural: "creditNotePlural",
    basePath: "/sales/credit-notes",
    contactFilter: "customer",
    statuses: ["draft", "sent", "paid", "cancelled"],
    actions: {
      draft: [
        { label: "markAsSent", targetStatus: "sent", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
      sent: [
        { label: "markAsPaid", targetStatus: "paid", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
    },
    conversionTargets: VALID_CONVERSIONS.credit_note ?? [],
    hasDueDate: false,
    hasDeliveryDate: false,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: "dueDate",
    bulkActions: [
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  dunning: {
    type: "dunning",
    label: "dunning",
    labelPlural: "dunningPlural",
    basePath: "/sales/dunning",
    contactFilter: "customer",
    statuses: ["draft", "sent", "cancelled"],
    actions: {
      draft: [
        { label: "markAsSent", targetStatus: "sent", variant: "primary" },
      ],
    },
    conversionTargets: VALID_CONVERSIONS.dunning ?? [],
    hasDueDate: false,
    hasDeliveryDate: false,
    hasPayments: false,
    canCreate: false,
    dueDateLabel: "dueDate",
    bulkActions: [
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
    ],
  },
  purchase_order: {
    type: "purchase_order",
    label: "purchaseOrder",
    labelPlural: "purchaseOrderPlural",
    basePath: "/purchasing/purchase-orders",
    contactFilter: "vendor",
    statuses: ["draft", "sent", "confirmed", "delivered", "cancelled"],
    actions: COMMON_SALES_ACTIONS,
    conversionTargets: VALID_CONVERSIONS.purchase_order ?? [],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: "expectedDelivery",
    bulkActions: [
      {
        id: "convert_to_purchase_invoice",
        label: "convertToPurchaseInvoice",
        action: "convert",
        variant: "primary",
        targetType: "purchase_invoice",
      },
      {
        id: "mark_sent",
        label: "markAsSent",
        action: "status_change",
        variant: "default",
        targetStatus: "sent",
        applicableStatuses: ["draft"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  purchase_invoice: {
    type: "purchase_invoice",
    label: "purchaseInvoice",
    labelPlural: "purchaseInvoicePlural",
    basePath: "/purchasing/purchase-invoices",
    contactFilter: "vendor",
    statuses: [
      "draft",
      "confirmed",
      "paid",
      "partially_paid",
      "overdue",
      "cancelled",
    ],
    actions: {
      draft: [
        { label: "confirm", targetStatus: "confirmed", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
      confirmed: [
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
      overdue: [
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
    },
    conversionTargets: VALID_CONVERSIONS.purchase_invoice ?? [],
    hasDueDate: true,
    hasDeliveryDate: false,
    hasPayments: true,
    canCreate: true,
    dueDateLabel: "dueDate",
    bulkActions: [
      {
        id: "confirm",
        label: "confirm",
        action: "status_change",
        variant: "primary",
        targetStatus: "confirmed",
        applicableStatuses: ["draft"],
      },
      {
        id: "mark_paid",
        label: "markAsPaid",
        action: "mark_paid",
        variant: "primary",
        applicableStatuses: ["confirmed", "partially_paid", "overdue"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
  },
  intake: {
    type: "intake",
    label: "intake",
    labelPlural: "intakePlural",
    basePath: "/intake",
    contactFilter: "all",
    statuses: ["draft", "confirmed", "cancelled"],
    actions: {
      draft: [
        { label: "confirm", targetStatus: "confirmed", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
    },
    conversionTargets: [],
    hasDueDate: false,
    hasDeliveryDate: false,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: "dueDate",
    bulkActions: [
      {
        id: "confirm",
        label: "confirm",
        action: "status_change",
        variant: "primary",
        targetStatus: "confirmed",
        applicableStatuses: ["draft"],
      },
      {
        id: "delete",
        label: "delete",
        action: "delete",
        variant: "destructive",
        applicableStatuses: ["draft"],
        requiresConfirmation: true,
      },
    ],
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
export function getFilterStatuses(
  type: DocumentType,
): (DocumentStatus | "all")[] {
  const config = DOCUMENT_TYPES[type];
  const base: (DocumentStatus | "all")[] = ["all"];

  if (config.statuses.includes("draft")) base.push("draft");
  if (config.statuses.includes("sent")) base.push("sent");
  if (config.statuses.includes("confirmed")) base.push("confirmed");
  if (config.statuses.includes("paid")) base.push("paid");
  if (config.statuses.includes("overdue")) base.push("overdue");
  if (config.statuses.includes("cancelled")) base.push("cancelled");

  return base;
}
