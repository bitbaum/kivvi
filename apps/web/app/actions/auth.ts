"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@kivvi/database";
import { eq } from "drizzle-orm";
import {
  createOwnedCompany,
  createCompanySchema,
} from "@kivvi/core/src/domain/memberships";
import type { ActionResult } from "./utils";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: createCompanySchema.shape.companyName,
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
  input: unknown,
): Promise<ActionResult<RegisterResult>> {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
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
        error: "An account with this email already exists",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create company, user, and owner membership atomically
    const result = await db.transaction(async (tx) => {
      // Create user first (needed for membership FK)
      const [user] = await tx
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
        })
        .returning();

      // Create company + owner membership (single source of truth)
      const company = await createOwnedCompany(tx, user.id, companyName);

      // Set user's active company
      await tx
        .update(users)
        .set({ companyId: company.companyId })
        .where(eq(users.id, user.id));

      return {
        userId: user.id,
        companyId: company.companyId,
        email: user.email,
        companyName: company.companyName,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch {
    return {
      success: false,
      error: "Failed to create account",
    };
  }
}
