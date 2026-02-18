'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { companies, users, numberSequences } from '@kivvi/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

const updateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  legalName: z.string().max(200).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().default('CH'),
  currency: z.string().max(3).optional().default('CHF'),
});

export async function updateCompanyAction(input: unknown): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = updateCompanySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const [company] = await db
      .update(companies)
      .set({
        name: parsed.data.name,
        legalName: parsed.data.legalName || null,
        vatNumber: parsed.data.vatNumber || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        country: parsed.data.country,
        currency: parsed.data.currency,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();

    revalidatePath('/settings');
    return { success: true, data: company };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update company settings') };
  }
}

// ============================================================================
// USER PROFILE
// ============================================================================

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
});

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await getSession();
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const [user] = await db
      .update(users)
      .set({
        name: parsed.data.name,
        email: parsed.data.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    revalidatePath('/settings');
    return { success: true, data: { id: user.id, name: user.name, email: user.email } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update profile') };
  }
}

// ============================================================================
// NUMBER SEQUENCES
// ============================================================================

const updateSequenceSchema = z.object({
  prefix: z.string().min(1).max(10),
  nextNumber: z.number().int().min(1),
  format: z.string().min(1).max(100),
});

export async function updateNumberSequenceAction(
  sequenceId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = updateSequenceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }
    const [seq] = await db
      .update(numberSequences)
      .set({
        prefix: parsed.data.prefix,
        nextNumber: parsed.data.nextNumber,
        format: parsed.data.format,
      })
      .where(and(eq(numberSequences.id, sequenceId), eq(numberSequences.companyId, companyId)))
      .returning();

    if (!seq) return { success: false, error: 'Sequence not found' };
    revalidatePath('/settings');
    return { success: true, data: seq };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update number sequence') };
  }
}
