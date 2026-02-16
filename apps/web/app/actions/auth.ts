'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, companies } from '@kivvi/database';
import { eq } from 'drizzle-orm';
import { DEFAULT_VAT_RATE } from '@/lib/config/vat-rates';
import type { ActionResult } from './utils';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export interface RegisterResult {
  userId: string;
  companyId: string;
  email: string;
  companyName: string;
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Register a new user and company.
 * Creates both company and user atomically in a transaction.
 */
export async function registerAction(
  input: unknown
): Promise<ActionResult<RegisterResult>> {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Validation failed',
      };
    }

    const { name, email, password, companyName } = parsed.data;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email already exists',
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create company and user atomically in transaction
    const result = await db.transaction(async (tx) => {
      // Create company
      const [company] = await tx
        .insert(companies)
        .values({
          name: companyName,
          currency: 'CHF',
          country: 'CH',
          settings: {
            defaultVatRate: Number(DEFAULT_VAT_RATE),
            invoicePrefix: 'INV',
            invoiceNextNumber: 1,
          },
        })
        .returning();

      // Create user with owner role
      const [user] = await tx
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
          companyId: company.id,
          role: 'owner',
        })
        .returning();

      return {
        userId: user.id,
        companyId: company.id,
        email: user.email,
        companyName: company.name,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Failed to create account',
    };
  }
}
