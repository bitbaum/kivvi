"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
  createContactSchema,
  updateContactSchema,
  createContactAddress,
  updateContactAddress,
  deleteContactAddress,
  createAddressSchema,
  updateAddressSchema,
} from "@kivvi/core";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
  formatZodError,
} from "./utils";
import { parseFormData } from "./parse-form-data";

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export async function createContactAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const raw = parseFormData(formData);

    const input = {
      type: raw.type as "customer" | "vendor" | "both",
      name: raw.name ?? "",
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      phone: raw.phone,
      mobile: raw.mobile,
      website: raw.website,
      address: raw.address,
      city: raw.city,
      postalCode: raw.postalCode,
      country: raw.country,
      vatNumber: raw.vatNumber,
      iban: raw.iban,
      bic: raw.bic,
      paymentTermsDays: raw.paymentTermsDays
        ? parseInt(raw.paymentTermsDays, 10)
        : null,
      creditLimit: raw.creditLimit,
      language: raw.language,
      notes: raw.notes,
    };

    // Validate before calling domain function
    const parsed = createContactSchema.safeParse(input);
    if (!parsed.success) {
      const { error, fieldErrors } = formatZodError(parsed.error);
      return { success: false, error, fieldErrors };
    }

    const contact = await createContact(db, companyId, parsed.data);

    revalidatePath("/contacts");
    return { success: true, data: { id: contact.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to create contact"),
    };
  }
}

export async function updateContactAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const raw = parseFormData(formData);

    const input = {
      type: raw.type as "customer" | "vendor" | "both" | undefined,
      name: raw.name ?? undefined,
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      phone: raw.phone,
      mobile: raw.mobile,
      website: raw.website,
      address: raw.address,
      city: raw.city,
      postalCode: raw.postalCode,
      country: raw.country,
      vatNumber: raw.vatNumber,
      iban: raw.iban,
      bic: raw.bic,
      paymentTermsDays: raw.paymentTermsDays
        ? parseInt(raw.paymentTermsDays, 10)
        : undefined,
      creditLimit: raw.creditLimit,
      language: raw.language,
      notes: raw.notes,
    };

    // Validate
    const parsed = updateContactSchema.safeParse(input);
    if (!parsed.success) {
      const { error, fieldErrors } = formatZodError(parsed.error);
      return { success: false, error, fieldErrors };
    }

    const contact = await updateContact(db, companyId, id, parsed.data);

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${id}`);
    return { success: true, data: { id: contact.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update contact"),
    };
  }
}

export async function deleteContactAction(id: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("member");

    await deleteContact(db, companyId, id);

    revalidatePath("/contacts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to delete contact"),
    };
  }
}

export async function searchContactsAction(
  query: string,
): Promise<ActionResult<Awaited<ReturnType<typeof searchContacts>>>> {
  try {
    const { companyId } = await getSession();
    const results = await searchContacts(db, companyId, query);
    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Search failed"),
    };
  }
}

// ============================================================================
// CONTACT ADDRESS ACTIONS
// ============================================================================

export async function createContactAddressAction(
  contactId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = createAddressSchema.safeParse(input);
    if (!parsed.success) {
      const { error, fieldErrors } = formatZodError(parsed.error);
      return { success: false, error, fieldErrors };
    }

    const addr = await createContactAddress(
      db,
      companyId,
      contactId,
      parsed.data,
    );

    revalidatePath(`/contacts/${contactId}`);
    return { success: true, data: { id: addr.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to create address"),
    };
  }
}

export async function updateContactAddressAction(
  contactId: string,
  addressId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const parsed = updateAddressSchema.safeParse(input);
    if (!parsed.success) {
      const { error, fieldErrors } = formatZodError(parsed.error);
      return { success: false, error, fieldErrors };
    }

    const addr = await updateContactAddress(
      db,
      companyId,
      contactId,
      addressId,
      parsed.data,
    );

    revalidatePath(`/contacts/${contactId}`);
    return { success: true, data: { id: addr.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update address"),
    };
  }
}

export async function deleteContactAddressAction(
  contactId: string,
  addressId: string,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("member");

    await deleteContactAddress(db, companyId, contactId, addressId);

    revalidatePath(`/contacts/${contactId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to delete address"),
    };
  }
}
