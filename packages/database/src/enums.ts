/**
 * Enum value arrays — the single source of truth for all pgEnum definitions.
 *
 * This file has ZERO dependencies on drizzle-orm or any DB driver, making it
 * safe to import in client components. schema.ts re-uses these arrays when
 * calling pgEnum(), so the values are never duplicated.
 */

export const CONTACT_TYPE_VALUES = ["customer", "vendor", "both"] as const;
export type ContactTypeValue = (typeof CONTACT_TYPE_VALUES)[number];

export const DOCUMENT_TYPE_VALUES = [
  "quote",
  "order",
  "order_confirmation",
  "delivery_note",
  "invoice",
  "credit_note",
  "purchase_order",
  "purchase_invoice",
  "dunning",
  "intake",
  "repair_order",
] as const;
export type DocumentTypeValue = (typeof DOCUMENT_TYPE_VALUES)[number];

export const DOCUMENT_STATUS_VALUES = [
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
] as const;
export type DocumentStatusValue = (typeof DOCUMENT_STATUS_VALUES)[number];

export const ACCOUNT_TYPE_VALUES = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
] as const;
export type AccountTypeValue = (typeof ACCOUNT_TYPE_VALUES)[number];

/**
 * Analytical dimension on bookings. `activity` = an ongoing operating segment
 * (Refurb-Verkauf, Reparaturen, …); `fund` = a donor-restricted fund (FER-21).
 */
export const COST_CENTER_KIND_VALUES = ["activity", "fund"] as const;
export type CostCenterKind = (typeof COST_CENTER_KIND_VALUES)[number];

/**
 * FER-21 restriction class of a fund — the decisive test is WHO imposed the
 * restriction. `extern_zweckgebunden` → Fondskapital (third-party purpose-bound,
 * not equity); `intern_gebunden`/`frei` → Organisationskapital.
 */
export const FUND_RESTRICTION_VALUES = [
  "extern_zweckgebunden",
  "intern_gebunden",
  "frei",
] as const;
export type FundRestriction = (typeof FUND_RESTRICTION_VALUES)[number];

export const STOCK_MOVEMENT_TYPE_VALUES = [
  "purchase",
  "sale",
  "adjustment",
  "transfer",
  "return",
] as const;
export type StockMovementTypeValue =
  (typeof STOCK_MOVEMENT_TYPE_VALUES)[number];

export const PRICE_RULE_TYPE_VALUES = [
  "fixed",
  "percentage",
  "tiered",
] as const;
export type PriceRuleTypeValue = (typeof PRICE_RULE_TYPE_VALUES)[number];

export const RECURRING_PERIODICITY_VALUES = [
  "monthly",
  "quarterly",
  "annual",
] as const;
export type RecurringPeriodicityValue =
  (typeof RECURRING_PERIODICITY_VALUES)[number];

export const PRODUCT_TYPE_VALUES = ["product", "service"] as const;
export type ProductTypeValue = (typeof PRODUCT_TYPE_VALUES)[number];

export const PAYMENT_METHOD_VALUES = [
  "bank_transfer",
  "cash",
  "card",
  "other",
] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHOD_VALUES)[number];

// ============================================================================
// SECONDHAND / INTAKE ENUMS
// ============================================================================

export const INTAKE_SOURCE_VALUES = [
  "donation",
  "purchase",
  "trade_in",
  "consignment",
  "estate_clearance",
  "return",
  "other",
] as const;
export type IntakeSourceValue = (typeof INTAKE_SOURCE_VALUES)[number];

export const ITEM_CONDITION_VALUES = [
  "untested",
  "like_new",
  "good",
  "fair",
  "poor",
  "parts_only",
  "scrap",
] as const;
export type ItemConditionValue = (typeof ITEM_CONDITION_VALUES)[number];

export const ITEM_STATUS_VALUES = [
  "intake",
  "testing",
  "repair",
  "parts_only",
  "ready_for_sale",
  "listed",
  "reserved",
  "sold",
  "returned",
  "donated",
  "recycled",
] as const;
export type ItemStatusValue = (typeof ITEM_STATUS_VALUES)[number];

export const ADDRESS_TYPE_VALUES = ["billing", "shipping", "other"] as const;
export type AddressTypeValue = (typeof ADDRESS_TYPE_VALUES)[number];

export const AI_PROVIDER_VALUES = [
  "anthropic",
  "groq",
  "openrouter",
  "ollama",
  "xai",
] as const;
export type AiProviderValue = (typeof AI_PROVIDER_VALUES)[number];

/** Display names for AI providers — brand names, no translation needed */
export const AI_PROVIDER_LABELS: Record<AiProviderValue, string> = {
  anthropic: "Anthropic (Claude)",
  groq: "Groq",
  openrouter: "OpenRouter",
  ollama: "Ollama (Local)",
  xai: "xAI (Grok)",
};

export const WEBHOOK_EVENT_VALUES = [
  "inventory_item.created",
  "inventory_item.updated",
  "inventory_item.status_changed",
  "document.created",
  "document.status_changed",
  "payment.received",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENT_VALUES)[number];

export const MEMBERSHIP_ROLE_VALUES = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const;
export type MembershipRoleValue = (typeof MEMBERSHIP_ROLE_VALUES)[number];
/** Roles assignable via invitation (owner excluded — granted at company creation) */
export const INVITABLE_ROLE_VALUES = [
  "admin",
  "member",
  "viewer",
] as const satisfies readonly MembershipRoleValue[];
/** @deprecated use INVITABLE_ROLE_VALUES */
export const INVITABLE_ROLES = INVITABLE_ROLE_VALUES;

export const PERMISSION_PRESET_VALUES = [
  "owner",
  "admin",
  "finance",
  "sales",
  "intake",
  "repair",
  "inventory",
  "viewer",
] as const;
export type PermissionPresetValue = (typeof PERMISSION_PRESET_VALUES)[number];

export const INVITABLE_PERMISSION_PRESET_VALUES = [
  "admin",
  "finance",
  "sales",
  "intake",
  "repair",
  "inventory",
  "viewer",
] as const satisfies readonly PermissionPresetValue[];

export const AVAILABILITY_TYPE_VALUES = [
  "volunteer",
  "employee",
  "contractor",
  "founder",
  "other",
] as const;
export type AvailabilityTypeValue = (typeof AVAILABILITY_TYPE_VALUES)[number];

export const VACANCY_TYPE_VALUES = [
  "employee",
  "volunteer",
  "internship",
  "contractor",
  "board",
  "other",
] as const;
export type VacancyTypeValue = (typeof VACANCY_TYPE_VALUES)[number];

export const LOCATION_MODE_VALUES = ["onsite", "hybrid", "remote"] as const;
export type LocationModeValue = (typeof LOCATION_MODE_VALUES)[number];

export const VACANCY_STATUS_VALUES = ["draft", "published", "closed"] as const;
export type VacancyStatusValue = (typeof VACANCY_STATUS_VALUES)[number];

export const JOIN_REQUEST_STATUS_VALUES = [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
] as const;
export type JoinRequestStatusValue =
  (typeof JOIN_REQUEST_STATUS_VALUES)[number];
