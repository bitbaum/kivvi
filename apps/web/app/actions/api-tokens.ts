"use server";

import { apiTokens } from "@kivvi/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createAction } from "./action-factory";
import { generateApiToken } from "@/lib/api-auth";
import { getTranslations } from "next-intl/server";

/**
 * Create a new API token. Returns the raw token ONCE — it cannot be retrieved later.
 */
export const createApiTokenAction = createAction<
  unknown,
  { id: string; rawToken: string; prefix: string }
>({
  handler: async (input, { companyId, userId, db }) => {
    const t = await getTranslations("settings.apiTokens");
    const createTokenSchema = z.object({
      name: z.string().min(1, t("nameRequired")).max(100),
    });
    const parsed = createTokenSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(
        parsed.error.errors[0]?.message || t("errorCreateFailed"),
      );
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

    return { id: token.id, rawToken, prefix: tokenPrefix };
  },
  revalidate: ["/settings"],
  errorMessage: () =>
    getTranslations("settings.apiTokens").then((t) => t("errorCreateFailed")),
  minRole: "admin",
});

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
  errorMessage: () =>
    getTranslations("settings.apiTokens").then((t) => t("errorListFailed")),
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
  errorMessage: () =>
    getTranslations("settings.apiTokens").then((t) => t("errorRevokeFailed")),
  handler: async (tokenId, { companyId, db }) => {
    const [updated] = await db
      .update(apiTokens)
      .set({ isActive: false })
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.companyId, companyId)))
      .returning({ id: apiTokens.id });
    if (!updated) throw new Error("token_not_found");
  },
});

/**
 * Delete an API token permanently.
 */
export const deleteApiTokenAction = createAction<string, void>({
  minRole: "admin",
  revalidate: ["/settings"],
  errorMessage: () =>
    getTranslations("settings.apiTokens").then((t) => t("errorDeleteFailed")),
  handler: async (tokenId, { companyId, db }) => {
    const [deleted] = await db
      .delete(apiTokens)
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.companyId, companyId)))
      .returning({ id: apiTokens.id });
    if (!deleted) throw new Error("token_not_found");
  },
});
