// Domain modules re-exported for convenience.
// NOTE: Do NOT import from this barrel in client components — it pulls in
// postgres driver via transitive deps.  Import specific domain files instead.

// Domain modules
export * from "./domain/number-sequences";
export * from "./domain/contacts";
export * from "./domain/products";
export * from "./domain/documents";
export * from "./domain/dunning";
export * from "./domain/accounting";
export * from "./domain/accounting-integration";
export * from "./domain/banking";
export * from "./domain/camt-parser";
export * from "./domain/inventory";
export * from "./domain/inventory-items";
export * from "./domain/intake-integration";
export * from "./domain/purchase-invoice-integration";
export * from "./domain/inventory-dashboard";
export * from "./domain/webhooks";
export * from "./domain/impact";
export * from "./domain/reports";
export * from "./domain/projects";
export * from "./domain/dashboard";
export * from "./domain/onboarding";
export * from "./domain/import-mappings";
export * from "./domain/import-bulk";
export * from "./domain/recurring-invoices";
// pdf-generation is NOT re-exported here because it imports pdfkit (Node.js only).
// Import directly: import { generateInvoicePdf } from '@kivvi/core/src/domain/pdf-generation';
export * from "./domain/email";
export * from "./domain/business-snapshot";
export * from "./domain/memberships";
export * from "./domain/invitations";
