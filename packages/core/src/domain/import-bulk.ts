import { eq, and, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import {
  contacts,
  contactAddresses,
  products,
  manufacturers,
  productGroups,
  documents,
  documentItems,
  journalEntries,
  journalLines,
  stockLevels,
  accounts,
  numberSequences,
  projects,
} from '@kivvi/database';
import type { Database } from '@kivvi/database';
import { DEFAULT_VAT_RATE } from '../config/vat-rates';
import type { ParsedLineItem } from './import-mappings';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkInsertResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

const BATCH_SIZE = 500;

// ============================================================================
// HELPERS: Lookup maps for FK resolution
// ============================================================================

/**
 * Build a map of contactNumber → contactId for a company.
 */
export async function buildContactLookup(
  db: Database,
  companyId: string
): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: contacts.id, contactNumber: contacts.contactNumber })
    .from(contacts)
    .where(eq(contacts.companyId, companyId));

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.contactNumber) map.set(row.contactNumber, row.id);
  }
  return map;
}

/**
 * Build a map of articleNumber → { id, unitPrice } for a company.
 */
export async function buildProductLookup(
  db: Database,
  companyId: string
): Promise<Map<string, { id: string; unitPrice: string }>> {
  const rows = await db
    .select({ id: products.id, articleNumber: products.articleNumber, unitPrice: products.unitPrice })
    .from(products)
    .where(eq(products.companyId, companyId));

  const map = new Map<string, { id: string; unitPrice: string }>();
  for (const row of rows) {
    if (row.articleNumber) map.set(row.articleNumber, { id: row.id, unitPrice: row.unitPrice || '0' });
  }
  return map;
}

/**
 * Build a map of account code → accountId for a company.
 */
export async function buildAccountCodeMap(
  db: Database,
  companyId: string
): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: accounts.id, code: accounts.code })
    .from(accounts)
    .where(eq(accounts.companyId, companyId));

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.code, row.id);
  }
  return map;
}

/**
 * Ensure product groups exist, creating any that are missing.
 * Returns a map of groupName → groupId.
 */
export async function ensureProductGroups(
  db: Database,
  companyId: string,
  groupNames: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(groupNames.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  // Fetch existing
  const existing = await db
    .select({ id: productGroups.id, name: productGroups.name })
    .from(productGroups)
    .where(eq(productGroups.companyId, companyId));

  for (const row of existing) {
    map.set(row.name, row.id);
  }

  // Create missing
  const missing = unique.filter((name) => !map.has(name));
  for (const name of missing) {
    const [created] = await db
      .insert(productGroups)
      .values({ companyId, name })
      .returning();
    map.set(name, created.id);
  }

  return map;
}

/**
 * Ensure manufacturers exist, creating any that are missing.
 * Returns a map of manufacturerName → manufacturerId.
 */
export async function ensureManufacturers(
  db: Database,
  companyId: string,
  manufacturerNames: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(manufacturerNames.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  // Fetch existing
  const existing = await db
    .select({ id: manufacturers.id, name: manufacturers.name })
    .from(manufacturers)
    .where(eq(manufacturers.companyId, companyId));

  for (const row of existing) {
    map.set(row.name, row.id);
  }

  // Create missing
  const missing = unique.filter((name) => !map.has(name));
  for (const name of missing) {
    const [created] = await db
      .insert(manufacturers)
      .values({ companyId, name })
      .returning();
    map.set(name, created.id);
  }

  return map;
}

// ============================================================================
// BULK INSERT: Contacts
// ============================================================================

export async function bulkInsertContacts(
  db: Database,
  companyId: string,
  rows: Array<Record<string, string | null>>,
  contactType: 'customer' | 'vendor' | 'both' = 'customer'
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];

    for (const row of batch) {
      if (!row.name) {
        skipped++;
        continue;
      }

      values.push({
        companyId,
        type: contactType,
        contactNumber: row.contactNumber || null,
        name: row.name,
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        email: row.email || null,
        phone: row.phone || null,
        address: row.address || null,
        city: row.city || null,
        postalCode: row.postalCode || null,
        country: row.country || 'CH',
        vatNumber: row.vatNumber || null,
        creditLimit: row.creditLimit || null,
        notes: row.notes || null,
        kivitendoId: row.kivitendoId ? parseInt(row.kivitendoId, 10) || null : null,
      });
    }

    if (values.length > 0) {
      try {
        const result = await db
          .insert(contacts)
          .values(values)
          .onConflictDoNothing();
        inserted += values.length;
      } catch (err) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`);
        skipped += values.length;
      }
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================================
// BULK INSERT: Contact Addresses
// ============================================================================

/**
 * Create contact_addresses records from address fields already on contacts.
 * For each contact that has address/city/postalCode, creates a billing address.
 * Uses onConflictDoNothing so it's safe to re-run.
 */
export async function bulkInsertContactAddresses(
  db: Database,
  companyId: string,
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Fetch all contacts with address data
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      address: contacts.address,
      city: contacts.city,
      postalCode: contacts.postalCode,
      country: contacts.country,
    })
    .from(contacts)
    .where(eq(contacts.companyId, companyId));

  // Check which contacts already have addresses
  const existingAddresses = await db
    .select({ contactId: contactAddresses.contactId })
    .from(contactAddresses);
  const hasAddress = new Set(existingAddresses.map((r) => r.contactId));

  const values = [];
  for (const row of rows) {
    // Skip contacts that already have addresses or have no address data
    if (hasAddress.has(row.id)) {
      skipped++;
      continue;
    }
    if (!row.address && !row.city && !row.postalCode) {
      skipped++;
      continue;
    }

    values.push({
      contactId: row.id,
      type: 'billing' as const,
      name: row.name,
      address: row.address,
      city: row.city,
      postalCode: row.postalCode,
      country: row.country || 'CH',
      isDefault: true,
    });
  }

  // Insert in batches
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    try {
      await db
        .insert(contactAddresses)
        .values(batch)
        .onConflictDoNothing();
      inserted += batch.length;
    } catch (err) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`);
      skipped += batch.length;
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================================
// BULK INSERT: Products
// ============================================================================

export async function bulkInsertProducts(
  db: Database,
  companyId: string,
  rows: Array<Record<string, string | null>>,
  productGroupMap: Map<string, string>,
  manufacturerMap: Map<string, string>
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];

    for (const row of batch) {
      if (!row.name) {
        skipped++;
        continue;
      }

      values.push({
        companyId,
        articleNumber: row.articleNumber || null,
        name: row.name,
        description: row.description || null,
        type: (row.type === 'service' ? 'service' : 'product') as 'product' | 'service',
        ean: row.ean || null,
        unitPrice: row.unitPrice || '0',
        purchasePrice: row.purchasePrice || null,
        unit: row.unit || 'piece',
        vatRate: DEFAULT_VAT_RATE,
        weight: row.weight || null,
        minStock: row.minStock ? parseInt(row.minStock, 10) || null : null,
        shopVisible: row.shopVisible === 'J' || row.shopVisible === 'true',
        productGroupId: row.productGroup ? productGroupMap.get(row.productGroup) || null : null,
        manufacturerId: row.manufacturer ? manufacturerMap.get(row.manufacturer) || null : null,
      });
    }

    if (values.length > 0) {
      try {
        await db
          .insert(products)
          .values(values)
          .onConflictDoNothing();
        inserted += values.length;
      } catch (err) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`);
        skipped += values.length;
      }
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================================
// BULK INSERT: Projects
// ============================================================================

export async function bulkInsertProjects(
  db: Database,
  companyId: string,
  rows: Array<Record<string, string | null>>,
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Map kivitendo status → kivvi project status
  const statusMap: Record<string, 'active' | 'completed' | 'on_hold' | 'cancelled'> = {
    'In Bearbeitung': 'active',
    'Fertiggestellt': 'completed',
    'Abgebrochen': 'cancelled',
  };

  for (const row of rows) {
    const name = row.name;
    if (!name) {
      skipped++;
      continue;
    }

    const kivitendoStatus = row.status?.trim() || '';
    const status = statusMap[kivitendoStatus] || 'active';
    const isActive = row.isActive?.trim() === 'Aktiv';

    // Store Projektnummer in description since kivvi has no projectNumber field
    const description = row.projectNumber
      ? `Projektnummer: ${row.projectNumber}`
      : null;

    try {
      await db
        .insert(projects)
        .values({
          companyId,
          name,
          description,
          status,
          isActive,
        })
        .onConflictDoNothing();
      inserted++;
    } catch (err) {
      errors.push(`Project "${name}": ${(err as Error).message}`);
      skipped++;
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================================
// BULK INSERT: Documents (invoices, quotes, orders, etc.)
// ============================================================================

/**
 * Insert documents from CSV rows. Rows that share the same document number
 * are grouped and become one document with multiple line items.
 *
 * When `structuredItems` is provided (keyed by document number), those are
 * used instead of parsing the truncated `positions` text field. This is the
 * correct path for Kivitendo imports where line items live as extra CSV columns.
 */
export async function bulkInsertDocuments(
  db: Database,
  companyId: string,
  userId: string,
  rows: Array<Record<string, string | null>>,
  contactLookup: Map<string, string>,
  documentType: 'invoice' | 'purchase_invoice' | 'quote' | 'order' | 'delivery_note',
  structuredItems?: Map<string, ParsedLineItem[]>,
  productLookup?: Map<string, { id: string; unitPrice: string }>,
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Group rows by document number
  const grouped = new Map<string, Array<Record<string, string | null>>>();
  for (const row of rows) {
    const docNumber = row.number;
    if (!docNumber) {
      skipped++;
      continue;
    }
    if (!grouped.has(docNumber)) {
      grouped.set(docNumber, []);
    }
    grouped.get(docNumber)!.push(row);
  }

  // Insert each document
  for (const [docNumber, docRows] of grouped) {
    try {
      const firstRow = docRows[0];

      // Resolve contact
      const contactNumber = firstRow.contactNumber;
      const contactId = contactNumber ? contactLookup.get(contactNumber) || null : null;

      // Determine status from payment info
      let status: 'draft' | 'paid' | 'sent' = 'sent';
      if (firstRow.paidAmount && firstRow.total) {
        try {
          const paid = new Decimal(firstRow.paidAmount);
          const total = new Decimal(firstRow.total);
          if (paid.gte(total) && total.gt(0)) status = 'paid';
        } catch {
          // Invalid numbers, keep as 'sent'
        }
      }

      // Parse dates - skip rows without a valid issue date (filters out position header/data rows)
      if (!firstRow.issueDate) {
        skipped++;
        continue;
      }
      const issueDate = new Date(firstRow.issueDate);
      if (isNaN(issueDate.getTime())) {
        skipped++;
        continue;
      }
      const dueDate = firstRow.dueDate ? new Date(firstRow.dueDate) : null;
      const deliveryDate = firstRow.deliveryDate ? new Date(firstRow.deliveryDate) : null;
      const paidDate = firstRow.paidDate ? new Date(firstRow.paidDate) : null;

      // Wrap document + items insert in transaction
      await db.transaction(async (tx) => {
        // Insert document
        const [doc] = await tx
          .insert(documents)
          .values({
            companyId,
            contactId,
            type: documentType,
            status,
            number: docNumber,
            issueDate,
            dueDate,
            deliveryDate,
            paidDate: status === 'paid' ? paidDate : null,
            subtotal: firstRow.subtotal || '0',
            vatAmount: firstRow.vatAmount || '0',
            total: firstRow.total || '0',
            notes: firstRow.notes || null,
            createdBy: userId,
          })
          .onConflictDoNothing()
          .returning();

        if (!doc) {
          throw new Error('Document already exists');
        }

        // Insert line items: prefer structured items from extra CSV columns
        const structured = structuredItems?.get(docNumber);
        if (structured && structured.length > 0) {
          const vatRate = firstRow.vatRate || DEFAULT_VAT_RATE;
          const docTotal = firstRow.total ? new Decimal(firstRow.total) : new Decimal(0);

          await tx.insert(documentItems).values(
            structured.map((item) => {
              const product = item.articleNumber
                ? productLookup?.get(item.articleNumber) || null
                : null;
              const productId = product?.id || null;
              const qty = item.quantity || '1';

              // Determine unitPrice: from product catalog, or derive from doc total for single items
              let unitPrice = '0';
              if (product?.unitPrice && product.unitPrice !== '0') {
                unitPrice = product.unitPrice;
              } else if (structured.length === 1 && docTotal.gt(0)) {
                // Single line item: derive unitPrice from document total
                const qtyDec = new Decimal(qty || '1');
                if (qtyDec.gt(0)) {
                  unitPrice = docTotal.div(qtyDec).toDecimalPlaces(2).toString();
                }
              }

              const total = new Decimal(qty || '0').times(new Decimal(unitPrice)).toDecimalPlaces(2).toString();

              return {
                documentId: doc.id,
                productId,
                position: item.position,
                description: item.description,
                quantity: qty,
                unitPrice,
                vatRate,
                total,
              };
            })
          );
        } else {
          // Fallback: parse the "Positionen" text field.
          // NOTE: This field is often truncated by header-mode CSV parsing —
          // it's a best-effort attempt that typically produces a single item
          // with the raw text as description. For proper line items, use
          // structuredItems from parseKivitendoLineItems().
          const positions = firstRow.positions;
          if (positions) {
            const items = parsePositions(positions, firstRow.vatRate || DEFAULT_VAT_RATE);
            if (items.length > 0) {
              await tx.insert(documentItems).values(
                items.map((item, idx) => ({
                  documentId: doc.id,
                  position: idx + 1,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  vatRate: item.vatRate,
                  total: item.total,
                }))
              );
            }
          }
        }
      });

      inserted++;
    } catch (err) {
      errors.push(`Document ${docNumber}: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Parse the "Positionen" text field from kivitendo CSV exports (fallback).
 *
 * WARNING: When CSVs are parsed in header mode, the position data beyond the
 * header columns gets dropped. The "Positionen" column only contains a truncated
 * text summary, NOT structured data. This function is a best-effort attempt to
 * extract items from that text. Results are typically a single item with the
 * raw text as description and unitPrice=0.
 *
 * For proper line items, use parseKivitendoLineItems() from import-mappings.ts
 * which reads the extra columns from array-mode CSV parsing.
 */
function parsePositions(
  positions: string,
  defaultVatRate: string
): Array<{ description: string; quantity: string; unitPrice: string; vatRate: string; total: string }> {
  if (!positions || positions.trim() === '') return [];

  const items: Array<{ description: string; quantity: string; unitPrice: string; vatRate: string; total: string }> = [];

  // Split by common delimiters (newlines, pipes)
  const lines = positions.split(/[\n|]/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Try to parse structured format: "qty x description @ price"
    const match = line.match(/^([\d.,]+)\s*(?:Stck|Stk|Std|x)?\s+(.+?)(?:\s+@\s*([\d.,]+))?$/i);
    if (match) {
      const qty = match[1].replace(/'/g, '') || '1';
      const desc = match[2].trim();
      const price = match[3]?.replace(/'/g, '') || '0';
      const total = new Decimal(qty || '0').times(new Decimal(price || '0')).toFixed(2);
      items.push({
        description: desc,
        quantity: qty,
        unitPrice: price,
        vatRate: defaultVatRate,
        total,
      });
    } else if (line.length > 0) {
      // Fallback: treat entire line as description with qty=1
      items.push({
        description: line,
        quantity: '1',
        unitPrice: '0',
        vatRate: defaultVatRate,
        total: '0',
      });
    }
  }

  return items;
}

// ============================================================================
// BULK INSERT: Journal Entries
// ============================================================================

export async function bulkInsertJournalEntries(
  db: Database,
  companyId: string,
  rows: Array<Record<string, string | null>>,
  accountCodeMap: Map<string, string>
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        const debitAccountCode = row.debitAccount;
        const creditAccountCode = row.creditAccount;
        const debitAmount = row.debitAmount;
        const creditAmount = row.creditAmount;

        if (!debitAccountCode || !creditAccountCode) {
          skipped++;
          continue;
        }

        const debitAccountId = accountCodeMap.get(debitAccountCode);
        const creditAccountId = accountCodeMap.get(creditAccountCode);

        if (!debitAccountId || !creditAccountId) {
          skipped++;
          continue;
        }

        const entryDate = row.date ? new Date(row.date) : new Date();

        // Wrap journal entry + lines insert in transaction
        await db.transaction(async (tx) => {
          // Create journal entry
          const [entry] = await tx
            .insert(journalEntries)
            .values({
              companyId,
              date: entryDate,
              reference: row.reference || null,
              description: row.description || row.notes || 'Imported from kivitendo',
              sourceType: 'manual',
            })
            .returning();

          // Create 2 journal lines (debit + credit)
          const lines = [];
          if (debitAmount && new Decimal(debitAmount || '0').gt(0)) {
            lines.push({
              journalEntryId: entry.id,
              accountId: debitAccountId,
              debit: debitAmount,
              credit: null,
              description: row.voucher || null,
            });
          }
          if (creditAmount && new Decimal(creditAmount || '0').gt(0)) {
            lines.push({
              journalEntryId: entry.id,
              accountId: creditAccountId,
              debit: null,
              credit: creditAmount,
              description: row.voucher || null,
            });
          }

          if (lines.length > 0) {
            await tx.insert(journalLines).values(lines);
          }
        });

        inserted++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
        skipped++;
      }
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================================
// BULK INSERT: Stock Levels
// ============================================================================

export async function bulkInsertStockLevels(
  db: Database,
  companyId: string,
  warehouseId: string,
  rows: Array<Record<string, string | null>>,
  productLookup: Map<string, { id: string; unitPrice: string }>
): Promise<BulkInsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const articleNumber = row.articleNumber;
      const quantity = row.quantity;

      if (!articleNumber || !quantity) {
        skipped++;
        continue;
      }

      const product = productLookup.get(articleNumber);
      const productId = product?.id;
      if (!productId) {
        skipped++;
        continue;
      }

      try {
        // Wrap stock level + product update in transaction
        await db.transaction(async (tx) => {
          // Upsert stock level
          await tx
            .insert(stockLevels)
            .values({
              productId,
              warehouseId,
              quantity,
              reservedQuantity: '0',
            })
            .onConflictDoUpdate({
              target: [stockLevels.productId, stockLevels.warehouseId],
              set: { quantity },
            });

          // Update cached product stock quantity
          await tx
            .update(products)
            .set({ stockQuantity: quantity })
            .where(and(
              eq(products.id, productId),
              eq(products.companyId, companyId)
            ));
        });

        inserted++;
      } catch (err) {
        errors.push(`Product ${articleNumber}: ${(err as Error).message}`);
        skipped++;
      }
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================================
// POST-IMPORT: Update number sequences
// ============================================================================

/**
 * After bulk import, update number sequences so new documents don't collide.
 * Finds the maximum existing number for each type and sets nextNumber = max + 1.
 */
// Max safe sequence number (fits in int32)
const MAX_SEQUENCE_NUMBER = 2_000_000_000;

function extractNextNumber(value: string): number | null {
  const numMatch = value.match(/(\d+)$/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);
  if (isNaN(num) || num >= MAX_SEQUENCE_NUMBER) return null;
  return num + 1;
}

export async function updateSequencesAfterImport(
  db: Database,
  companyId: string
): Promise<void> {
  // Update contact sequence
  const [maxContact] = await db
    .select({ max: sql<string>`MAX(${contacts.contactNumber})` })
    .from(contacts)
    .where(eq(contacts.companyId, companyId));

  if (maxContact?.max) {
    const nextNum = extractNextNumber(maxContact.max);
    if (nextNum) {
      await db
        .update(numberSequences)
        .set({ nextNumber: nextNum })
        .where(and(
          eq(numberSequences.companyId, companyId),
          eq(numberSequences.type, 'contact')
        ));
    }
  }

  // Update document sequences based on max document numbers
  const docTypes = [
    { seqType: 'invoice', docType: 'invoice' as const },
    { seqType: 'quote', docType: 'quote' as const },
    { seqType: 'order', docType: 'order' as const },
    { seqType: 'delivery_note', docType: 'delivery_note' as const },
    { seqType: 'purchase_invoice', docType: 'purchase_invoice' as const },
    { seqType: 'purchase_order', docType: 'purchase_order' as const },
    { seqType: 'credit_note', docType: 'credit_note' as const },
  ];

  for (const { seqType, docType } of docTypes) {
    const [maxDoc] = await db
      .select({ max: sql<string>`MAX(${documents.number})` })
      .from(documents)
      .where(and(
        eq(documents.companyId, companyId),
        eq(documents.type, docType)
      ));

    if (maxDoc?.max) {
      const nextNum = extractNextNumber(maxDoc.max);
      if (nextNum) {
        await db
          .update(numberSequences)
          .set({ nextNumber: nextNum })
          .where(and(
            eq(numberSequences.companyId, companyId),
            eq(numberSequences.type, seqType)
          ));
      }
    }
  }

  // Update product sequence
  const [maxProduct] = await db
    .select({ max: sql<string>`MAX(${products.articleNumber})` })
    .from(products)
    .where(eq(products.companyId, companyId));

  if (maxProduct?.max) {
    const nextNum = extractNextNumber(maxProduct.max);
    if (nextNum) {
      await db
        .update(numberSequences)
        .set({ nextNumber: nextNum })
        .where(and(
          eq(numberSequences.companyId, companyId),
          eq(numberSequences.type, 'product')
        ));
    }
  }
}
