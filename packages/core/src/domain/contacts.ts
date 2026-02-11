import { z } from 'zod';
import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { contacts, contactAddresses, documents } from '@kivvi/database';
import type { Database } from '@kivvi/database';
import type { Contact, ContactAddress } from '@kivvi/database';
import { getNextNumber } from './number-sequences';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createContactSchema = z.object({
  type: z.enum(['customer', 'vendor', 'both']),
  name: z.string().min(1, 'Name is required').max(200),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  mobile: z.string().max(30).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(5).optional().nullable(),
  vatNumber: z.string().max(30).optional().nullable(),
  iban: z.string().max(34).optional().nullable(),
  bic: z.string().max(11).optional().nullable(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  creditLimit: z.string().optional().nullable(),
  language: z.string().max(5).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ============================================================================
// FILTERS & RESULT TYPES
// ============================================================================

export interface ContactFilters {
  search?: string;
  type?: 'customer' | 'vendor' | 'both';
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'contactNumber' | 'createdAt' | 'city';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ContactWithDetails {
  contact: Contact;
  addresses: ContactAddress[];
  recentDocuments: Array<{
    id: string;
    type: string;
    number: string;
    status: string;
    total: string;
    issueDate: Date;
  }>;
}

// ============================================================================
// DOMAIN FUNCTIONS
// ============================================================================

/**
 * List contacts with pagination, search, and filters.
 */
export async function listContacts(
  db: Database,
  companyId: string,
  filters: ContactFilters = {}
): Promise<PaginatedResult<Contact>> {
  const {
    search,
    type,
    isActive = true,
    page = 1,
    pageSize = 25,
    sortBy = 'name',
    sortOrder = 'asc',
  } = filters;

  // Build WHERE conditions
  const conditions = [eq(contacts.companyId, companyId)];

  if (isActive !== undefined) {
    conditions.push(eq(contacts.isActive, isActive));
  }

  if (type) {
    conditions.push(eq(contacts.type, type));
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(contacts.name, term),
        ilike(contacts.email, term),
        ilike(contacts.contactNumber, term),
        ilike(contacts.city, term),
        ilike(contacts.firstName, term),
        ilike(contacts.lastName, term),
      )!
    );
  }

  const where = and(...conditions);

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(where);
  const total = Number(countResult[0]?.count ?? 0);

  // Sort
  const sortColumn = {
    name: contacts.name,
    contactNumber: contacts.contactNumber,
    createdAt: contacts.createdAt,
    city: contacts.city,
  }[sortBy] ?? contacts.name;

  const orderFn = sortOrder === 'desc' ? desc : asc;

  // Fetch page
  const offset = (page - 1) * pageSize;
  const data = await db
    .select()
    .from(contacts)
    .where(where)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset(offset);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get a single contact with addresses and recent documents.
 */
export async function getContact(
  db: Database,
  companyId: string,
  contactId: string
): Promise<ContactWithDetails | null> {
  // Fetch contact
  const result = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.companyId, companyId)
      )
    )
    .limit(1);

  const contact = result[0];
  if (!contact) return null;

  // Fetch addresses
  const addresses = await db
    .select()
    .from(contactAddresses)
    .where(eq(contactAddresses.contactId, contactId));

  // Fetch recent documents (last 10)
  const recentDocuments = await db
    .select({
      id: documents.id,
      type: documents.type,
      number: documents.number,
      status: documents.status,
      total: documents.total,
      issueDate: documents.issueDate,
    })
    .from(documents)
    .where(
      and(
        eq(documents.contactId, contactId),
        eq(documents.companyId, companyId)
      )
    )
    .orderBy(desc(documents.issueDate))
    .limit(10);

  return { contact, addresses, recentDocuments };
}

/**
 * Create a new contact with auto-generated contact number.
 */
export async function createContact(
  db: Database,
  companyId: string,
  input: CreateContactInput
): Promise<Contact> {
  const validated = createContactSchema.parse(input);

  // Generate contact number
  const contactNumber = await getNextNumber(db, companyId, 'contact');

  // Clean empty strings to null
  const cleanedInput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(validated)) {
    cleanedInput[key] = value === '' ? null : value;
  }

  const [created] = await db
    .insert(contacts)
    .values({
      companyId,
      contactNumber,
      type: cleanedInput.type as 'customer' | 'vendor' | 'both',
      name: cleanedInput.name as string,
      firstName: cleanedInput.firstName as string | null,
      lastName: cleanedInput.lastName as string | null,
      email: cleanedInput.email as string | null,
      phone: cleanedInput.phone as string | null,
      mobile: cleanedInput.mobile as string | null,
      website: cleanedInput.website as string | null,
      address: cleanedInput.address as string | null,
      city: cleanedInput.city as string | null,
      postalCode: cleanedInput.postalCode as string | null,
      country: (cleanedInput.country as string) || 'CH',
      vatNumber: cleanedInput.vatNumber as string | null,
      iban: cleanedInput.iban as string | null,
      bic: cleanedInput.bic as string | null,
      paymentTermsDays: (cleanedInput.paymentTermsDays as number) ?? 30,
      creditLimit: cleanedInput.creditLimit as string | null,
      language: (cleanedInput.language as string) || 'de',
      notes: cleanedInput.notes as string | null,
    })
    .returning();

  return created;
}

/**
 * Update an existing contact.
 */
export async function updateContact(
  db: Database,
  companyId: string,
  contactId: string,
  input: UpdateContactInput
): Promise<Contact> {
  const validated = updateContactSchema.parse(input);

  // Clean empty strings to null
  const cleanedInput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(validated)) {
    cleanedInput[key] = value === '' ? null : value;
  }

  const [updated] = await db
    .update(contacts)
    .set({
      ...cleanedInput,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.companyId, companyId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error('Contact not found');
  }

  return updated;
}

/**
 * Soft delete a contact (set isActive = false).
 */
export async function deleteContact(
  db: Database,
  companyId: string,
  contactId: string
): Promise<Contact> {
  const [deleted] = await db
    .update(contacts)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.companyId, companyId)
      )
    )
    .returning();

  if (!deleted) {
    throw new Error('Contact not found');
  }

  return deleted;
}

/**
 * Quick search contacts by name, email, or contact number.
 * Returns up to 10 results for autocomplete / picker use.
 */
export async function searchContacts(
  db: Database,
  companyId: string,
  query: string
): Promise<Pick<Contact, 'id' | 'name' | 'contactNumber' | 'email' | 'type'>[]> {
  if (!query || !query.trim()) return [];

  const term = `%${query.trim()}%`;

  const results = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      contactNumber: contacts.contactNumber,
      email: contacts.email,
      type: contacts.type,
    })
    .from(contacts)
    .where(
      and(
        eq(contacts.companyId, companyId),
        eq(contacts.isActive, true),
        or(
          ilike(contacts.name, term),
          ilike(contacts.email, term),
          ilike(contacts.contactNumber, term),
        )
      )
    )
    .orderBy(asc(contacts.name))
    .limit(10);

  return results;
}
