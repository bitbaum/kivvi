'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
  createContactSchema,
  updateContactSchema,
} from '@kivvi/core';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

// ============================================================================
// HELPERS
// ============================================================================

async function getCompanyId(): Promise<string> {
  const { companyId } = await getSession();
  return companyId;
}

function formDataToObject(formData: FormData): Record<string, string | null> {
  const obj: Record<string, string | null> = {};
  formData.forEach((value, key) => {
    const str = value.toString().trim();
    obj[key] = str === '' ? null : str;
  });
  return obj;
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export async function createContactAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const companyId = await getCompanyId();
    const raw = formDataToObject(formData);

    const input = {
      type: raw.type as 'customer' | 'vendor' | 'both',
      name: raw.name ?? '',
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
      paymentTermsDays: raw.paymentTermsDays ? parseInt(raw.paymentTermsDays, 10) : null,
      creditLimit: raw.creditLimit,
      language: raw.language,
      notes: raw.notes,
    };

    // Validate before calling domain function
    const parsed = createContactSchema.safeParse(input);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0];
      return { success: false, error: firstError || 'Validation failed' };
    }

    const contact = await createContact(db, companyId, parsed.data);

    revalidatePath('/contacts');
    return { success: true, data: { id: contact.id } };
  } catch (error) {
    console.error('createContactAction error:', error);
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to create contact'),
    };
  }
}

export async function updateContactAction(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const companyId = await getCompanyId();
    const raw = formDataToObject(formData);

    const input = {
      type: raw.type as 'customer' | 'vendor' | 'both' | undefined,
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
      paymentTermsDays: raw.paymentTermsDays ? parseInt(raw.paymentTermsDays, 10) : undefined,
      creditLimit: raw.creditLimit,
      language: raw.language,
      notes: raw.notes,
    };

    // Validate
    const parsed = updateContactSchema.safeParse(input);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0];
      return { success: false, error: firstError || 'Validation failed' };
    }

    const contact = await updateContact(db, companyId, id, parsed.data);

    revalidatePath('/contacts');
    revalidatePath(`/contacts/${id}`);
    return { success: true, data: { id: contact.id } };
  } catch (error) {
    console.error('updateContactAction error:', error);
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to update contact'),
    };
  }
}

export async function deleteContactAction(
  id: string
): Promise<ActionResult> {
  try {
    const companyId = await getCompanyId();

    await deleteContact(db, companyId, id);

    revalidatePath('/contacts');
    return { success: true };
  } catch (error) {
    console.error('deleteContactAction error:', error);
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to delete contact'),
    };
  }
}

export async function searchContactsAction(
  query: string
): Promise<ActionResult<Awaited<ReturnType<typeof searchContacts>>>> {
  try {
    const companyId = await getCompanyId();
    const results = await searchContacts(db, companyId, query);
    return { success: true, data: results };
  } catch (error) {
    console.error('searchContactsAction error:', error);
    return {
      success: false,
      error: safeErrorMessage(error, 'Search failed'),
    };
  }
}
