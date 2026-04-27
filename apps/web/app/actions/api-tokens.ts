"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { apiTokens } from "@kivvi/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { type ActionResult, requireRole, safeErrorMessage } from "./utils";
import { createAction } from "./action-factory";
import { generateApiToken } from "@/lib/api-auth";
import { getTranslations } from "next-intl/server";

/**
 * Create a new API token. Returns the raw token ONCE — it cannot be retrieved later.
 */
export async function createApiTokenAction(
  input: unknown,
): Promise<ActionResult<{ id: string; rawToken: string; prefix: string }>> {
  const t = await getTranslations("settings.apiTokens");
  try {
    const { companyId, userId } = await requireRole("admin");
    const createTokenSchema = z.object({
      name: z.string().min(1, t("nameRequired")).max(100),
    });
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
      error: safeErrorMessage(error, t("errorCreateFailed")),
    };
  }
}

type ApiTokenListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

/**
 * List all API tokens for the current company. Does NOT return the token itself.
 */
export const listApiTokensAction = createAction<void, ApiTokenListItem[]>({
  errorMessage: "Failed to list API tokens",
  handler: async (_input, { companyId, db }) =>
    db
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
      .where(eq(apiTokens.companyId, companyId)),
});

/**
 * Revoke (deactivate) an API token.
 */
export const revokeApiTokenAction = createAction<string, void>({
  minRole: "admin",
  revalidate: ["/settings"],
  errorMessage: "Failed to revoke API token",
  handler: async (tokenId, { companyId, db }) => {
    const [updated] = await db
      .update(apiTokens)
      .set({ isActive: false })
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.companyId, companyId)))
      .returning({ id: apiTokens.id });
    if (!updated) throw new Error("Token not found");
  },
});

/**
 * Delete an API token permanently.
 */
export const deleteApiTokenAction = createAction<string, void>({
  minRole: "admin",
  revalidate: ["/settings"],
  errorMessage: "Failed to delete API token",
  handler: async (tokenId, { companyId, db }) => {
    const [deleted] = await db
      .delete(apiTokens)
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.companyId, companyId)))
      .returning({ id: apiTokens.id });
    if (!deleted) throw new Error("Token not found");
  },
});
