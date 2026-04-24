/**
 * Ricardo.ch Seller API v2 client
 *
 * Auth: OAuth 2.0 — Client Credentials flow
 * Base URL: https://api.ricardo.ch/v2
 *
 * NOTE: API endpoints and auth parameters must be verified against
 * Ricardo's official API documentation before production use.
 * Contact: api@ricardo.ch
 */

import type {
  RicardoListingPayload,
  RicardoListingResult,
} from "@kivvi/core/src/domain/ricardo";

const RICARDO_API_BASE = "https://api.ricardo.ch/v2";
const RICARDO_TOKEN_URL = "https://api.ricardo.ch/oauth/token";

// ─── Token cache (per-process, per API key) ─────────────────────────────────

interface TokenEntry {
  accessToken: string;
  expiresAt: number; // unix ms
}

const tokenCache = new Map<string, TokenEntry>();

async function getAccessToken(apiKey: string): Promise<string> {
  const cached = tokenCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken;
  }

  // API key is stored as "clientId:clientSecret" (colon-separated)
  const [clientId, clientSecret] = apiKey.split(":");
  if (!clientId || !clientSecret) {
    throw new Error(
      "Invalid Ricardo API key format. Expected 'clientId:clientSecret'.",
    );
  }

  const res = await fetch(RICARDO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "listing:write listing:read",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ricardo auth failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const entry: TokenEntry = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  tokenCache.set(apiKey, entry);
  return entry.accessToken;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken(apiKey);
  const res = await fetch(`${RICARDO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Ricardo API ${method} ${path} failed (${res.status}): ${text}`,
    );
  }

  return res.json() as Promise<T>;
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function publishListing(
  apiKey: string,
  payload: RicardoListingPayload,
): Promise<RicardoListingResult> {
  const data = await request<{ id: string; url: string }>(
    apiKey,
    "POST",
    "/listings",
    payload,
  );
  return {
    listingId: data.id,
    listingUrl: data.url,
  };
}

export async function updateListing(
  apiKey: string,
  listingId: string,
  payload: Partial<RicardoListingPayload>,
): Promise<void> {
  await request(apiKey, "PATCH", `/listings/${listingId}`, payload);
}

export async function deleteListing(
  apiKey: string,
  listingId: string,
): Promise<void> {
  await request(apiKey, "DELETE", `/listings/${listingId}`);
}

export async function testConnection(
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getAccessToken(apiKey);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
