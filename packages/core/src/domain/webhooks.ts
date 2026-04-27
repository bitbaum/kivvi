/**
 * Webhook dispatcher for Kivvi's outbound event system.
 *
 * Companies configure webhook endpoints in Settings → Integrations.
 * When Kivvi domain events occur (inventory created, document invoiced, etc.)
 * the dispatcher fires signed POST requests to all active matching endpoints.
 *
 * Signing: HMAC-SHA256 of the JSON payload, sent as X-Kivvi-Signature header.
 * Consumers verify: crypto.createHmac("sha256", secret).update(body).digest("hex")
 *
 * Retry: exponential backoff — 1m, 5m, 30m, 2h, 8h (max 5 attempts).
 * After 5 failures the delivery is abandoned (nextRetryAt = null).
 */

import { createHmac } from "crypto";
import { eq, and, lte, isNotNull, desc } from "drizzle-orm";
import { webhookEndpoints, webhookDeliveries } from "@kivvi/database";
import type { Database, WebhookEvent } from "@kivvi/database";
import { logger } from "../logger";

// Retry delays in milliseconds: 1m, 5m, 30m, 2h, 8h
const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000, 7_200_000, 28_800_000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

/** Sign a payload string with the endpoint's secret */
function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Fire an event to all active, subscribed endpoints for a company.
 * Non-blocking: failures are logged and queued for retry — never throws.
 */
export async function dispatchWebhookEvent(
  db: Database,
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  // Find all active endpoints for this company that subscribe to this event
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.companyId, companyId),
        eq(webhookEndpoints.isActive, true),
      ),
    );

  const subscribed = endpoints.filter((ep) =>
    (ep.events as WebhookEvent[]).includes(event),
  );

  if (subscribed.length === 0) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    companyId,
    data,
  };
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subscribed.map((ep) =>
      deliverWebhook(db, ep.id, ep.url, ep.secret, event, payload, body),
    ),
  );
}

async function deliverWebhook(
  db: Database,
  endpointId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  payload: object,
  body: string,
): Promise<void> {
  const signature = sign(secret, body);

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let deliveredAt: Date | null = null;
  let nextRetryAt: Date | null = null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kivvi-Event": event,
        "X-Kivvi-Signature": signature,
        "User-Agent": "Kivvi-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    statusCode = response.status;
    responseBody = await response.text().catch(() => null);

    if (response.ok) {
      deliveredAt = new Date();
    } else {
      // Non-2xx: schedule retry
      nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[0]);
    }
  } catch (err) {
    logger.warn("Webhook delivery failed", {
      endpointId,
      url,
      event,
      error: String(err),
    });
    nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[0]);
  }

  await db.insert(webhookDeliveries).values({
    endpointId,
    event,
    payload,
    statusCode,
    responseBody,
    attemptCount: 1,
    nextRetryAt,
    deliveredAt,
  });
}

/**
 * Retry failed deliveries. Called by the cron job at /api/cron/webhook-retry.
 * Picks up deliveries where nextRetryAt is in the past, attempts re-delivery,
 * then either marks delivered or schedules next retry (up to MAX_ATTEMPTS).
 */
export async function retryFailedDeliveries(db: Database): Promise<void> {
  const due = await db
    .select({ delivery: webhookDeliveries, endpoint: webhookEndpoints })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookDeliveries.endpointId, webhookEndpoints.id),
    )
    .where(
      and(
        isNotNull(webhookDeliveries.nextRetryAt),
        lte(webhookDeliveries.nextRetryAt, new Date()),
        eq(webhookEndpoints.isActive, true),
      ),
    )
    .limit(50);

  await Promise.allSettled(
    due.map(async ({ delivery, endpoint }) => {
      const body = JSON.stringify(delivery.payload);
      const signature = sign(endpoint.secret, body);
      const attempt = delivery.attemptCount + 1;

      let statusCode: number | null = null;
      let responseBody: string | null = null;
      let deliveredAt: Date | null = null;
      let nextRetryAt: Date | null = null;

      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kivvi-Event": delivery.event as WebhookEvent,
            "X-Kivvi-Signature": signature,
            "User-Agent": "Kivvi-Webhook/1.0",
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        statusCode = response.status;
        responseBody = await response.text().catch(() => null);

        if (response.ok) {
          deliveredAt = new Date();
        } else if (attempt < MAX_ATTEMPTS) {
          nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[attempt]);
        }
        // else: abandon — nextRetryAt stays null
      } catch {
        if (attempt < MAX_ATTEMPTS) {
          nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[attempt]);
        }
      }

      await db
        .update(webhookDeliveries)
        .set({
          statusCode,
          responseBody,
          attemptCount: attempt,
          nextRetryAt,
          deliveredAt,
        })
        .where(eq(webhookDeliveries.id, delivery.id));
    }),
  );
}

// ============================================================================
// CRUD — Endpoint management (called from Server Actions)
// ============================================================================

export async function listWebhookEndpoints(db: Database, companyId: string) {
  return db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.companyId, companyId));
}

/**
 * List recent deliveries for one endpoint.
 * Joins with webhookEndpoints to verify the endpoint belongs to companyId
 * before returning any data.
 */
export async function listWebhookDeliveries(
  db: Database,
  companyId: string,
  endpointId: string,
  limit = 50,
) {
  // Verify ownership first
  const [ep] = await db
    .select({ id: webhookEndpoints.id })
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.companyId, companyId),
      ),
    )
    .limit(1);

  if (!ep) throw new Error("Webhook endpoint not found");

  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.endpointId, endpointId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
}

export async function createWebhookEndpoint(
  db: Database,
  companyId: string,
  input: { name: string; url: string; secret: string; events: WebhookEvent[] },
) {
  const [endpoint] = await db
    .insert(webhookEndpoints)
    .values({ companyId, ...input })
    .returning();
  return endpoint;
}

export async function updateWebhookEndpoint(
  db: Database,
  companyId: string,
  endpointId: string,
  input: Partial<{
    name: string;
    url: string;
    secret: string;
    events: WebhookEvent[];
    isActive: boolean;
  }>,
) {
  const [updated] = await db
    .update(webhookEndpoints)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.companyId, companyId),
      ),
    )
    .returning();
  if (!updated) throw new Error("Webhook endpoint not found");
  return updated;
}

export async function deleteWebhookEndpoint(
  db: Database,
  companyId: string,
  endpointId: string,
) {
  await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.companyId, companyId),
      ),
    );
}
