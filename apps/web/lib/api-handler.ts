import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { MembershipRole } from "@kivvi/database";
import { auth } from "./auth";
import { extractBearerToken, validateApiToken } from "./api-auth";
import { findMembership } from "@kivvi/core/src/domain/memberships";
import { db } from "./db";

interface ApiContext {
  companyId: string;
  userId: string;
}

/** Role hierarchy levels for comparison */
const ROLE_LEVEL: Record<MembershipRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/**
 * Authenticate an API request using either:
 * 1. Bearer token (API key) from Authorization header
 * 2. Session cookie (NextAuth)
 *
 * Optionally enforces a minimum role via `minRole`.
 * Returns the authenticated context or an error response.
 */
export async function authenticateApi(
  request: NextRequest,
  minRole?: MembershipRole,
): Promise<ApiContext | NextResponse> {
  // Try API key first
  const authHeader = request.headers.get("authorization");
  const bearerToken = extractBearerToken(authHeader);

  let ctx: ApiContext;

  if (bearerToken) {
    const result = await validateApiToken(bearerToken);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired API token" },
        { status: 401 },
      );
    }
    ctx = { companyId: result.companyId, userId: result.userId };
  } else {
    // Fall back to session auth
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized. Provide a Bearer token or authenticate via session.",
        },
        { status: 401 },
      );
    }
    ctx = { companyId: session.user.companyId, userId: session.user.id };
  }

  // Enforce minimum role if specified
  if (minRole) {
    const membership = await findMembership(db, ctx.userId, ctx.companyId);
    const userRole = (membership?.role ?? "viewer") as MembershipRole;
    if (ROLE_LEVEL[userRole] < ROLE_LEVEL[minRole]) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }
  }

  return ctx;
}

/**
 * Standard API error response.
 */
export function apiError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Standard API success response.
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

/**
 * Shared pagination fields for v1 API query schemas.
 * Spread into route-specific z.object() to add page/pageSize params.
 */
export const paginationQueryFields = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
};
