import { z } from "zod";
import { eq, and, or, ilike, sql, desc, asc } from "drizzle-orm";
import { contacts, contactAddresses, documents } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import type { Contact, ContactAddress } from "@kivvi/database";
import { CONTACT_TYPE_VALUES } from "@kivvi/database/src/enums";
import { getNextNumber } from "./number-sequences";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Base fields shared between create and update schemas
const contactBaseSchema = z.object({
  type: z.enum(CONTACT_TYPE_VALUES),
  /** Display name. If omitted on create, auto-derived from firstName + lastName. */
  name: z.string().min(1).max(200).optional().nullable(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal("")),
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
  paymentTermsDays: z.coerce
    .number()
    .int()
    .min(0)
    .max(365)
    .optional()
    .nullable(),
  creditLimit: z.string().optional().nullable(),
  language: z.string().max(5).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

// Create requires at least one of: name, firstName, lastName
export const createContactSchema = contactBaseSchema.superRefine(
  (data, ctx) => {
    const hasName = data.name?.trim();
    const hasFirstOrLast = data.firstName?.trim() || data.lastName?.trim();
    if (!hasName && !hasFirstOrLast) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name oder Vor-/Nachname erforderlich",
        path: ["name"],
      });
    }
  },
);

// Update allows partial fields — no name requirement (patch semantics)
export const updateContactSchema = contactBaseSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ============================================================================
// FILTERS & RESULT TYPES
// ============================================================================

export interface ContactFilters {
  search?: string;
  type?: "customer" | "vendor" | "both";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "contactNumber" | "createdAt" | "city";
  sortOrder?: "asc" | "desc";
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
export type ContactListItem = Contact & { lastDocumentAt: Date | null };

export async function listContacts(
  db: Database,
  companyId: string,
  filters: ContactFilters = {},
): Promise<PaginatedResult<ContactListItem>> {
  const {
    search,
    type,
    isActive = true,
    page = 1,
    pageSize = 25,
    sortBy = "name",
    sortOrder = "asc",
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
      )!,
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
  const sortColumn =
    {
      name: contacts.name,
      contactNumber: contacts.contactNumber,
      createdAt: contacts.createdAt,
      city: contacts.city,
    }[sortBy] ?? contacts.name;

  const orderFn = sortOrder === "desc" ? desc : asc;

  // Fetch page with last document date
  const offset = (page - 1) * pageSize;
  const data = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      contactNumber: contacts.contactNumber,
      type: contacts.type,
      name: contacts.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      mobile: contacts.mobile,
      website: contacts.website,
      address: contacts.address,
      city: contacts.city,
      postalCode: contacts.postalCode,
      country: contacts.country,
      vatNumber: contacts.vatNumber,
      iban: contacts.iban,
      bic: contacts.bic,
      paymentTermsDays: contacts.paymentTermsDays,
      creditLimit: contacts.creditLimit,
      language: contacts.language,
      notes: contacts.notes,
      isActive: contacts.isActive,
      kivitendoId: contacts.kivitendoId,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      lastDocumentAt: sql<Date | null>`(
        SELECT MAX(${documents.issueDate})
        FROM ${documents}
        WHERE ${documents.contactId} = ${contacts.id}
          AND ${documents.companyId} = ${contacts.companyId}
      )`.as("lastDocumentAt"),
    })
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
  contactId: string,
): Promise<ContactWithDetails | null> {
  // Fetch contact
  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)))
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
        eq(documents.companyId, companyId),
      ),
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
  input: CreateContactInput,
): Promise<Contact> {
  const validated = createContactSchema.parse(input);

  // Auto-derive display name from firstName + lastName if name not provided
  // Schema guarantees at least one of name/firstName/lastName is present
  const effectiveName =
    validated.name?.trim() ||
    [validated.firstName, validated.lastName].filter(Boolean).join(" ");

  // Generate contact number
  const contactNumber = await getNextNumber(db, companyId, "contact");

  // Clean empty strings to null
  const cleanedInput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(validated)) {
    cleanedInput[key] = value === "" ? null : value;
  }

  const [created] = await db
    .insert(contacts)
    .values({
      companyId,
      contactNumber,
      type: cleanedInput.type as "customer" | "vendor" | "both",
      name: effectiveName,
      firstName: cleanedInput.firstName as string | null,
      lastName: cleanedInput.lastName as string | null,
      email: cleanedInput.email as string | null,
      phone: cleanedInput.phone as string | null,
      mobile: cleanedInput.mobile as string | null,
      website: cleanedInput.website as string | null,
      address: cleanedInput.address as string | null,
      city: cleanedInput.city as string | null,
      postalCode: cleanedInput.postalCode as string | null,
      country: (cleanedInput.country as string) || "CH",
      vatNumber: cleanedInput.vatNumber as string | null,
      iban: cleanedInput.iban as string | null,
      bic: cleanedInput.bic as string | null,
      paymentTermsDays: (cleanedInput.paymentTermsDays as number) ?? 30,
      creditLimit: cleanedInput.creditLimit as string | null,
      language: (cleanedInput.language as string) || "de",
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
  input: UpdateContactInput,
): Promise<Contact> {
  const validated = updateContactSchema.parse(input);

  // Clean empty strings to null
  const cleanedInput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(validated)) {
    cleanedInput[key] = value === "" ? null : value;
  }

  const [updated] = await db
    .update(contacts)
    .set({
      ...cleanedInput,
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)))
    .returning();

  if (!updated) {
    throw new Error("Contact not found");
  }

  return updated;
}

/**
 * Soft delete a contact (set isActive = false).
 */
export async function deleteContact(
  db: Database,
  companyId: string,
  contactId: string,
): Promise<Contact> {
  const [deleted] = await db
    .update(contacts)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)))
    .returning();

  if (!deleted) {
    throw new Error("Contact not found");
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
  query: string,
): Promise<
  Pick<
    Contact,
    "id" | "name" | "contactNumber" | "email" | "type" | "paymentTermsDays"
  >[]
> {
  if (!query || !query.trim()) return [];

  const term = `%${query.trim()}%`;

  const results = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      contactNumber: contacts.contactNumber,
      email: contacts.email,
      type: contacts.type,
      paymentTermsDays: contacts.paymentTermsDays,
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
        ),
      ),
    )
    .orderBy(asc(contacts.name))
    .limit(10);

  return results;
}

// ============================================================================
// CONTACT ADDRESSES
// ============================================================================

export const createAddressSchema = z.object({
  type: z.enum(["billing", "shipping", "other"]),
  name: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().default("CH"),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

/**
 * Add an address to a contact. If isDefault is true, unset other defaults of the same type.
 */
export async function createContactAddress(
  db: Database,
  companyId: string,
  contactId: string,
  input: CreateAddressInput,
): Promise<ContactAddress> {
  const validated = createAddressSchema.parse(input);

  // Verify contact belongs to company
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)));

  if (!contact) throw new Error("Contact not found");

  return db.transaction(async (tx) => {
    // If setting as default, unset other defaults of same type
    if (validated.isDefault) {
      await tx
        .update(contactAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(contactAddresses.contactId, contactId),
            eq(contactAddresses.type, validated.type),
          ),
        );
    }

    const [addr] = await tx
      .insert(contactAddresses)
      .values({
        contactId,
        type: validated.type,
        name: validated.name || null,
        address: validated.address || null,
        city: validated.city || null,
        postalCode: validated.postalCode || null,
        country: validated.country || "CH",
        isDefault: validated.isDefault ?? false,
      })
      .returning();

    return addr;
  });
}

/**
 * Update a contact address. Verifies contact belongs to company.
 */
export async function updateContactAddress(
  db: Database,
  companyId: string,
  contactId: string,
  addressId: string,
  input: UpdateAddressInput,
): Promise<ContactAddress> {
  const validated = updateAddressSchema.parse(input);

  // Verify contact belongs to company
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)));

  if (!contact) throw new Error("Contact not found");

  return db.transaction(async (tx) => {
    // If setting as default and type is specified or we need to check existing type
    if (validated.isDefault && validated.type) {
      await tx
        .update(contactAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(contactAddresses.contactId, contactId),
            eq(contactAddresses.type, validated.type),
          ),
        );
    }

    const [updated] = await tx
      .update(contactAddresses)
      .set({
        ...validated,
      })
      .where(
        and(
          eq(contactAddresses.id, addressId),
          eq(contactAddresses.contactId, contactId),
        ),
      )
      .returning();

    if (!updated) throw new Error("Address not found");
    return updated;
  });
}

/**
 * Delete a contact address. Verifies contact belongs to company.
 */
export async function deleteContactAddress(
  db: Database,
  companyId: string,
  contactId: string,
  addressId: string,
): Promise<void> {
  // Verify contact belongs to company
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)));

  if (!contact) throw new Error("Contact not found");

  const result = await db
    .delete(contactAddresses)
    .where(
      and(
        eq(contactAddresses.id, addressId),
        eq(contactAddresses.contactId, contactId),
      ),
    )
    .returning();

  if (result.length === 0) throw new Error("Address not found");
}

// ============================================================================
// CONTACT RESOLUTION
// ============================================================================

/**
 * Resolve or create a contact from name + optional email.
 * Used when external callers (e.g. API integrations) don't have a Kivvi contactId.
 *
 * Priority: email match → name match (ilike) → create new customer record.
 */
export async function resolveOrCreateContact(
  db: Database,
  companyId: string,
  name: string,
  email?: string,
): Promise<string> {
  // 1. Exact email match
  if (email) {
    const [byEmail] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.companyId, companyId),
          ilike(contacts.email, email.trim()),
        ),
      )
      .limit(1);
    if (byEmail) return byEmail.id;
  }

  // 2. Name match (case-insensitive)
  const [byName] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(eq(contacts.companyId, companyId), ilike(contacts.name, name.trim())),
    )
    .limit(1);
  if (byName) return byName.id;

  // 3. Create a minimal customer record
  const created = await createContact(db, companyId, {
    type: "customer",
    name: name.trim(),
    email: email?.trim() || null,
  });
  return created.id;
}
