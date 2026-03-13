"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { apiTokens } from "@kivvi/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { generateApiToken } from "@/lib/api-auth";

const createTokenSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

/**
 * Create a new API token. Returns the raw token ONCE — it cannot be retrieved later.
 */
export async function createApiTokenAction(
  input: unknown,
): Promise<ActionResult<{ id: string; rawToken: string; prefix: string }>> {
  try {
    const { companyId, userId } = await requireRole("admin");
    const parsed = createTokenSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Invalid input",
      };
    }

    const { rawToken, tokenHash, tokenPrefix } = generateApiToken();

    const [token] = await db
      .insert(apiTokens)
      .values({
        companyId,
        userId,
        name: parsed.data.name,
        tokenHash,
        tokenPrefix,
      })
      .returning({ id: apiTokens.id });

    revalidatePath("/settings");
    return {
      success: true,
      data: { id: token.id, rawToken, prefix: tokenPrefix },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to create API token"),
    };
  }
}

/**
 * List all API tokens for the current company. Does NOT return the token itself.
 */
export async function listApiTokensAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string;
      tokenPrefix: string;
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      isActive: boolean;
      createdAt: Date;
    }>
  >
> {
  try {
    const { companyId } = await getSession();

    const tokens = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        tokenPrefix: apiTokens.tokenPrefix,
        lastUsedAt: apiTokens.lastUsedAt,
        expiresAt: apiTokens.expiresAt,
        isActive: apiTokens.isActive,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.companyId, companyId));

    return { success: true, data: tokens };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to list API tokens"),
    };
  }
}

/**
 * Revoke (deactivate) an API token.
 */
export async function revokeApiTokenAction(
  tokenId: string,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("admin");

    const [updated] = await db
      .update(apiTokens)
      .set({ isActive: false })
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.companyId, companyId)))
      .returning({ id: apiTokens.id });

    if (!updated) {
      return { success: false, error: "Token not found" };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to revoke API token"),
    };
  }
}

/**
 * Delete an API token permanently.
 */
export async function deleteApiTokenAction(
  tokenId: string,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("admin");

    const [deleted] = await db
      .delete(apiTokens)
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.companyId, companyId)))
      .returning({ id: apiTokens.id });

    if (!deleted) {
      return { success: false, error: "Token not found" };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to delete API token"),
    };
  }
}
