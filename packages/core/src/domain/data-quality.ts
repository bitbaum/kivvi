/**
 * Data quality detection functions.
 *
 * Each function returns a list of issues — records that are incomplete,
 * inconsistent, or likely wrong. All functions are read-only (no mutations).
 * Mutations live in the server actions layer.
 *
 * Designed to be run after data migrations and periodically during operation.
 * All checks are tenant-scoped (companyId required).
 */

import Decimal from "decimal.js";
import { eq, and, sql, isNull, ne, lt, or, inArray } from "drizzle-orm";
import {
  contacts,
  contactAddresses,
  documents,
  documentItems,
  products,
} from "@kivvi/database";
import type { Database, DocumentStatusValue } from "@kivvi/database";
import { ACTIVE_STATUSES } from "../config/document-constants";

// ============================================================================
// TYPES
// ============================================================================

export interface DuplicateContactGroup {
  normalizedName: string;
  contacts: {
    id: string;
    name: string;
    contactNumber: string | null;
    email: string | null;
    type: string;
    documentCount: number;
  }[];
}

export interface ContactIssue {
  id: string;
  name: string;
  contactNumber: string | null;
  type: string;
  issue: "no_email_with_invoices" | "no_address" | "inactive_with_open_docs";
}

export interface DocumentIssue {
  id: string;
  number: string;
  type: string;
  status: string;
  total: string;
  issueDate: Date | null;
  contactId: string | null;
  contactName: string | null;
  issue: "zero_total" | "no_contact" | "no_items" | "stale_draft";
}

export interface ProductIssue {
  id: string;
  name: string;
  articleNumber: string | null;
  unitPrice: string;
  issue: "zero_price" | "no_category";
}

export interface DataQualityReport {
  duplicateContactGroups: DuplicateContactGroup[];
  contactIssues: ContactIssue[];
  documentIssues: DocumentIssue[];
  productIssues: ProductIssue[];
  summary: {
    duplicateContactGroups: number;
    contactIssues: number;
    documentIssues: number;
    productIssues: number;
    total: number;
  };
}

// ============================================================================
// CONTACTS
// ============================================================================

/**
 * Find contacts with identical normalized names within the same company.
 * Normalization: lowercase, trim, collapse whitespace.
 * Returns groups of 2+ contacts that share a normalized name.
 */
export async function findDuplicateContacts(
  db: Database,
  companyId: string,
): Promise<DuplicateContactGroup[]> {
  // Get all active contacts
  const allContacts = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      contactNumber: contacts.contactNumber,
      email: contacts.email,
      type: contacts.type,
    })
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.isActive, true)));

  // Group by normalized name
  const groups = new Map<string, typeof allContacts>();
  for (const c of allContacts) {
    const normalized = c.name.toLowerCase().trim().replace(/\s+/g, " ");
    const existing = groups.get(normalized) ?? [];
    existing.push(c);
    groups.set(normalized, existing);
  }

  // Filter to groups with 2+ contacts
  const duplicateGroups = [...groups.entries()].filter(
    ([, members]) => members.length >= 2,
  );

  if (duplicateGroups.length === 0) return [];

  // Get document counts for all contacts in duplicate groups
  const allContactIds = duplicateGroups.flatMap(([, members]) =>
    members.map((m) => m.id),
  );

  const docCounts = await db
    .select({
      contactId: documents.contactId,
      count: sql<number>`COUNT(*)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        inArray(documents.contactId, allContactIds),
      ),
    )
    .groupBy(documents.contactId);

  const countMap = new Map(
    docCounts.map((r) => [r.contactId, Number(r.count)]),
  );

  return duplicateGroups.map(([normalizedName, members]) => ({
    normalizedName,
    contacts: members.map((m) => ({
      ...m,
      documentCount: countMap.get(m.id) ?? 0,
    })),
  }));
}

/**
 * Find contacts with data completeness issues:
 * - Customers with at least one invoice but no email address
 * - Contacts with no billing address (neither inline fields nor a contactAddress)
 * - Inactive contacts that have open (non-paid, non-cancelled) documents
 */
export async function findContactIssues(
  db: Database,
  companyId: string,
): Promise<ContactIssue[]> {
  const issues: ContactIssue[] = [];

  // 1. Customers with invoices but no email
  const customersWithInvoices = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      contactNumber: contacts.contactNumber,
      type: contacts.type,
      email: contacts.email,
    })
    .from(contacts)
    .innerJoin(
      documents,
      and(
        eq(documents.contactId, contacts.id),
        eq(documents.type, "invoice"),
        ne(documents.status, "cancelled"),
      ),
    )
    .where(
      and(
        eq(contacts.companyId, companyId),
        eq(contacts.isActive, true),
        isNull(contacts.email),
      ),
    )
    .groupBy(
      contacts.id,
      contacts.name,
      contacts.contactNumber,
      contacts.type,
      contacts.email,
    );

  for (const c of customersWithInvoices) {
    issues.push({ ...c, issue: "no_email_with_invoices" });
  }

  // 2. Contacts with no address (inline address AND no billing contactAddress)
  const contactsWithAddresses = await db
    .select({ contactId: contactAddresses.contactId })
    .from(contactAddresses)
    .innerJoin(contacts, eq(contacts.id, contactAddresses.contactId))
    .where(eq(contacts.companyId, companyId));

  const contactsWithAddressSet = new Set(
    contactsWithAddresses.map((r) => r.contactId),
  );

  const allContacts = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      contactNumber: contacts.contactNumber,
      type: contacts.type,
      address: contacts.address,
    })
    .from(contacts)
    .where(and(eq(contacts.companyId, companyId), eq(contacts.isActive, true)));

  for (const c of allContacts) {
    const hasInlineAddress = !!c.address?.trim();
    const hasSeparateAddress = contactsWithAddressSet.has(c.id);
    if (!hasInlineAddress && !hasSeparateAddress) {
      issues.push({
        id: c.id,
        name: c.name,
        contactNumber: c.contactNumber,
        type: c.type,
        issue: "no_address",
      });
    }
  }

  // 3. Inactive contacts with open documents
  const inactiveWithOpenDocs = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      contactNumber: contacts.contactNumber,
      type: contacts.type,
    })
    .from(contacts)
    .innerJoin(
      documents,
      and(
        eq(documents.contactId, contacts.id),
        inArray(documents.status, [...ACTIVE_STATUSES]),
      ),
    )
    .where(and(eq(contacts.companyId, companyId), eq(contacts.isActive, false)))
    .groupBy(contacts.id, contacts.name, contacts.contactNumber, contacts.type);

  for (const c of inactiveWithOpenDocs) {
    issues.push({ ...c, issue: "inactive_with_open_docs" });
  }

  return issues;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

const STALE_DRAFT_DAYS = 90;

/**
 * Find documents with data quality issues:
 * - Non-draft/non-cancelled documents with zero total (bad migration artifact)
 * - Non-draft invoices with no linked contact
 * - Non-draft/non-cancelled documents with no line items
 * - Drafts older than STALE_DRAFT_DAYS days
 */
export async function findDocumentIssues(
  db: Database,
  companyId: string,
): Promise<DocumentIssue[]> {
  const issues: DocumentIssue[] = [];
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - STALE_DRAFT_DAYS);

  // Fetch all active (non-cancelled) documents with their contact name
  const allDocs = await db
    .select({
      id: documents.id,
      number: documents.number,
      type: documents.type,
      status: documents.status,
      total: documents.total,
      issueDate: documents.issueDate,
      contactId: documents.contactId,
      contactName: contacts.name,
    })
    .from(documents)
    .leftJoin(contacts, eq(contacts.id, documents.contactId))
    .where(
      and(
        eq(documents.companyId, companyId),
        ne(documents.status, "cancelled"),
      ),
    );

  // Get document IDs that have at least one item
  const docsWithItems = await db
    .select({ documentId: documentItems.documentId })
    .from(documentItems)
    .innerJoin(documents, eq(documents.id, documentItems.documentId))
    .where(eq(documents.companyId, companyId))
    .groupBy(documentItems.documentId);

  const docsWithItemsSet = new Set(docsWithItems.map((r) => r.documentId));

  for (const doc of allDocs) {
    const total = new Decimal(doc.total ?? "0");

    // Zero total on non-draft docs (excluding intake which legitimately has 0)
    if (
      total.isZero() &&
      doc.status !== "draft" &&
      doc.type !== "intake" &&
      doc.type !== "delivery_note"
    ) {
      issues.push({ ...doc, total: doc.total ?? "0", issue: "zero_total" });
      continue; // one issue per doc
    }

    // Invoices and purchase invoices with no contact
    if (
      !doc.contactId &&
      (doc.type === "invoice" ||
        doc.type === "purchase_invoice" ||
        doc.type === "quote" ||
        doc.type === "order")
    ) {
      issues.push({ ...doc, total: doc.total ?? "0", issue: "no_contact" });
      continue;
    }

    // No line items on non-draft, non-intake docs
    if (
      doc.status !== "draft" &&
      doc.type !== "intake" &&
      !docsWithItemsSet.has(doc.id)
    ) {
      issues.push({ ...doc, total: doc.total ?? "0", issue: "no_items" });
      continue;
    }

    // Stale drafts
    if (
      doc.status === "draft" &&
      doc.issueDate &&
      doc.issueDate < staleThreshold
    ) {
      issues.push({ ...doc, total: doc.total ?? "0", issue: "stale_draft" });
    }
  }

  return issues;
}

// ============================================================================
// PRODUCTS
// ============================================================================

/**
 * Find products with data quality issues:
 * - Active products with zero price and non-flexible pricing
 * - Active products with no product group (uncategorized)
 */
export async function findProductIssues(
  db: Database,
  companyId: string,
): Promise<ProductIssue[]> {
  const issues: ProductIssue[] = [];

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      articleNumber: products.articleNumber,
      unitPrice: products.unitPrice,
      isPriceFlexible: products.isPriceFlexible,
      productGroupId: products.productGroupId,
    })
    .from(products)
    .where(and(eq(products.companyId, companyId), eq(products.isActive, true)));

  for (const p of allProducts) {
    const price = new Decimal(p.unitPrice ?? "0");
    if (price.isZero() && !p.isPriceFlexible) {
      issues.push({
        id: p.id,
        name: p.name,
        articleNumber: p.articleNumber,
        unitPrice: p.unitPrice ?? "0",
        issue: "zero_price",
      });
    } else if (!p.productGroupId) {
      issues.push({
        id: p.id,
        name: p.name,
        articleNumber: p.articleNumber,
        unitPrice: p.unitPrice ?? "0",
        issue: "no_category",
      });
    }
  }

  return issues;
}

// ============================================================================
// FULL REPORT
// ============================================================================

export async function getDataQualityReport(
  db: Database,
  companyId: string,
): Promise<DataQualityReport> {
  const [duplicateContactGroups, contactIssues, documentIssues, productIssues] =
    await Promise.all([
      findDuplicateContacts(db, companyId),
      findContactIssues(db, companyId),
      findDocumentIssues(db, companyId),
      findProductIssues(db, companyId),
    ]);

  return {
    duplicateContactGroups,
    contactIssues,
    documentIssues,
    productIssues,
    summary: {
      duplicateContactGroups: duplicateContactGroups.length,
      contactIssues: contactIssues.length,
      documentIssues: documentIssues.length,
      productIssues: productIssues.length,
      total:
        duplicateContactGroups.length +
        contactIssues.length +
        documentIssues.length +
        productIssues.length,
    },
  };
}
