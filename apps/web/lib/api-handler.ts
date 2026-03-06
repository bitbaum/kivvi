import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { extractBearerToken, validateApiToken } from './api-auth';

interface ApiContext {
  companyId: string;
  userId: string;
}

/**
 * Authenticate an API request using either:
 * 1. Bearer token (API key) from Authorization header
 * 2. Session cookie (NextAuth)
 *
 * Returns the authenticated context or a 401 response.
 */
export async function authenticateApi(
  request: NextRequest
): Promise<ApiContext | NextResponse> {
  // Try API key first
  const authHeader = request.headers.get('authorization');
  const bearerToken = extractBearerToken(authHeader);

  if (bearerToken) {
    const result = await validateApiToken(bearerToken);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired API token' },
        { status: 401 }
      );
    }
    return { companyId: result.companyId, userId: result.userId };
  }

  // Fall back to session auth
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Provide a Bearer token or authenticate via session.' },
      { status: 401 }
    );
  }

  return { companyId: session.user.companyId, userId: session.user.id };
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
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: true, data, ...meta ? { meta } : {} });
}
