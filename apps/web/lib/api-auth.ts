import { createHash, randomBytes } from "crypto";
import { eq, and } from "drizzle-orm";
import { apiTokens } from "@kivvi/database";
import { db } from "./db";
import { logger } from "./logger";

const TOKEN_PREFIX = "kv_";

/**
 * Generate a new API token. Returns the raw token (only shown once)
 * and the hash to store in the database.
 */
export function generateApiToken(): {
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const bytes = randomBytes(32);
  const rawToken = TOKEN_PREFIX + bytes.toString("base64url");
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawToken.slice(0, 11) + "...";
  return { rawToken, tokenHash, tokenPrefix };
}

/**
 * Hash a token using SHA-256 for storage.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Validate an API token from a request. Returns the companyId and userId
 * if valid, or null if invalid/expired/inactive.
 */
export async function validateApiToken(
  token: string,
): Promise<{ companyId: string; userId: string; tokenId: string } | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const tokenHash = hashToken(token);

  const [record] = await db
    .select({
      id: apiTokens.id,
      companyId: apiTokens.companyId,
      userId: apiTokens.userId,
      isActive: apiTokens.isActive,
      expiresAt: apiTokens.expiresAt,
    })
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, tokenHash), eq(apiTokens.isActive, true)));

  if (!record) return null;

  // Check expiry
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) return null;

  // Update last used timestamp (fire-and-forget, log failures)
  db.update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, record.id))
    .catch((err) => logger.warn("Failed to update token lastUsedAt", err));

  return {
    companyId: record.companyId,
    userId: record.userId,
    tokenId: record.id,
  };
}

/**
 * Extract Bearer token from Authorization header.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}
