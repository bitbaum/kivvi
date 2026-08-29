import type { DocumentType, DocumentStatus } from "@kivvi/database";
import { VALID_CONVERSIONS } from "@kivvi/core/src/domain/document-conversions";
import { TERMINAL_DOCUMENT_STATUSES } from "@kivvi/core/src/config/document-constants";
export {
  DEFAULT_PAYMENT_TERMS_DAYS,
  OVERDUE_ELIGIBLE_STATUSES,
  TERMINAL_DOCUMENT_STATUSES,
  isValidDocumentTransition,
} from "@kivvi/core/src/config/document-constants";

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
  action: "convert" | "status_change" | "delete" | "extend_validity" | "dunning" | "mark_paid";
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

/** @deprecated Use TERMINAL_DOCUMENT_STATUSES from document-constants */
export const TERMINAL_STATUSES: DocumentStatus[] = [
  ...TERMINAL_DOCUMENT_STATUSES,
] as DocumentStatus[];

/**
 * Typed status constants — use these instead of hardcoded strings in JSX.
 * Derived from DocumentStatus so TypeScript catches typos.
 */
export const STATUS = {
  DRAFT: "draft" as DocumentStatus,
  SENT: "sent" as DocumentStatus,
  CONFIRMED: "confirmed" as DocumentStatus,
  DELIVERED: "delivered" as DocumentStatus,
  PAID: "paid" as DocumentStatus,
  PARTIALLY_PAID: "partially_paid" as DocumentStatus,
  CANCELLED: "cancelled" as DocumentStatus,
  OVERDUE: "overdue" as DocumentStatus,
  DUNNING_1: "dunning_1" as DocumentStatus,
  DUNNING_2: "dunning_2" as DocumentStatus,
  DUNNING_3: "dunning_3" as DocumentStatus,
} as const;

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

// `satisfies` ensures every DocumentStatus has a style entry.
// TypeScript errors here if a new status is added to the enum without a style.
const _statusStyles = {
  draft: "bg-neutral/10 text-neutral",
  sent: "bg-info/10 text-info",
  confirmed: "bg-info/10 text-info",
  delivered: "bg-tag-purple/10 text-tag-purple",
  paid: "bg-success/10 text-success",
  partially_paid: "bg-warning/10 text-warning",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-neutral/10 text-neutral",
  dunning_1: "bg-destructive/10 text-destructive",
  dunning_2: "bg-destructive/20 text-destructive",
  dunning_3: "bg-destructive/30 text-destructive",
} satisfies Record<DocumentStatus, string>;

export const STATUS_STYLES: Record<string, string> = _statusStyles;

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
  delivered: [{ label: "cancel", targetStatus: "cancelled", variant: "destructive" }],
  overdue: [{ label: "cancel", targetStatus: "cancelled", variant: "destructive" }],
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
      draft: [{ label: "markAsSent", targetStatus: "sent", variant: "primary" }],
      sent: [{ label: "confirm", targetStatus: "confirmed", variant: "primary" }],
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
      draft: [{ label: "markAsSent", targetStatus: "sent", variant: "primary" }],
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
      draft: [{ label: "markAsSent", targetStatus: "sent", variant: "primary" }],
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
    statuses: ["draft", "confirmed", "paid", "partially_paid", "overdue", "cancelled"],
    actions: {
      draft: [
        { label: "confirm", targetStatus: "confirmed", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
      confirmed: [{ label: "cancel", targetStatus: "cancelled", variant: "destructive" }],
      overdue: [{ label: "cancel", targetStatus: "cancelled", variant: "destructive" }],
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
  repair_order: {
    type: "repair_order",
    label: "repairOrder",
    labelPlural: "repairOrderPlural",
    basePath: "/repairs",
    contactFilter: "all",
    statuses: ["draft", "confirmed", "delivered", "paid", "cancelled"],
    actions: {
      draft: [
        { label: "confirm", targetStatus: "confirmed", variant: "primary" },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
      confirmed: [
        {
          label: "markDelivered",
          targetStatus: "delivered",
          variant: "primary",
        },
        { label: "cancel", targetStatus: "cancelled", variant: "destructive" },
      ],
      delivered: [{ label: "cancel", targetStatus: "cancelled", variant: "destructive" }],
    },
    conversionTargets: VALID_CONVERSIONS.repair_order ?? [],
    hasDueDate: false,
    hasDeliveryDate: true,
    hasPayments: false,
    canCreate: true,
    dueDateLabel: "expectedCompletion",
    bulkActions: [
      {
        id: "convert_to_invoice",
        label: "convertToInvoice",
        action: "convert",
        variant: "primary",
        targetType: "invoice",
      },
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

/** Maps intake source DB values to their documents-namespace translation keys. */
export const INTAKE_SOURCE_LABEL_KEYS: Record<string, string> = {
  donation: "intakeSourceDonation",
  purchase: "intakeSourcePurchase",
  trade_in: "intakeSourceTradeIn",
  consignment: "intakeSourceConsignment",
  estate_clearance: "intakeSourceEstate",
  return: "intakeSourceReturn",
  other: "intakeSourceOther",
};

/** Fallback when an intake source has no explicit label/role mapping. */
export const INTAKE_SOURCE_LABEL_FALLBACK = "intakeSourceOther";
export const INTAKE_CONTACT_ROLE_FALLBACK = "intakeContactSeller";

/**
 * Maps intake source DB values to the contact-role translation key used for the
 * contact heading/label (a donor gives, a seller sells, an owner consigns, etc.).
 */
export const INTAKE_CONTACT_ROLE_LABEL_KEYS: Record<string, string> = {
  donation: "intakeContactDonor",
  purchase: "intakeContactSeller",
  estate_clearance: "intakeContactSeller",
  trade_in: "intakeContactCustomer",
  return: "intakeContactCustomer",
  consignment: "intakeContactOwner",
  other: "intakeContactSeller",
};

/**
 * Get the filter status tabs shown on the list page for a document type.
 * Returns the most commonly used statuses for filtering.
 */
export function getFilterStatuses(type: DocumentType): (DocumentStatus | "all")[] {
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
