import { and, count, eq, isNull, or, sql } from "drizzle-orm";
import {
  apiIdempotencyKeys,
  apiTokens,
  webhookDeliveries,
  webhookEndpoints,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";

export type IntegrationHealthStatus = "healthy" | "warning" | "error";

export interface IntegrationHealth {
  status: IntegrationHealthStatus;
  activeApiTokens: number;
  activeWebhookEndpoints: number;
  totalWebhookEndpoints: number;
  pendingWebhookRetries: number;
  failedWebhookDeliveries: number;
  deliveredWebhooks24h: number;
  pendingIdempotencyKeys: number;
  completedIdempotencyKeys24h: number;
  lastWebhookAt: Date | null;
  lastApiWriteAt: Date | null;
}

export function classifyIntegrationHealth(input: {
  activeApiTokens: number;
  activeWebhookEndpoints: number;
  pendingWebhookRetries: number;
  failedWebhookDeliveries: number;
  pendingIdempotencyKeys: number;
}): IntegrationHealthStatus {
  if (
    input.activeApiTokens === 0 ||
    input.activeWebhookEndpoints === 0 ||
    input.failedWebhookDeliveries > 0
  ) {
    return "error";
  }

  if (input.pendingWebhookRetries > 0 || input.pendingIdempotencyKeys > 0) {
    return "warning";
  }

  return "healthy";
}

export async function getIntegrationHealth(
  db: Database,
  companyId: string,
  now = new Date(),
): Promise<IntegrationHealth> {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const dayAgoIso = dayAgo.toISOString();

  const [[tokenRow], [endpointRow], [deliveryRow], [idempotencyRow]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(apiTokens)
        .where(
          and(
            eq(apiTokens.companyId, companyId),
            eq(apiTokens.isActive, true),
            or(
              isNull(apiTokens.expiresAt),
              sql`${apiTokens.expiresAt} > ${nowIso}`,
            ),
          ),
        ),
      db
        .select({
          total: sql<number>`COUNT(*)::int`,
          active: sql<number>`COUNT(*) FILTER (WHERE ${webhookEndpoints.isActive})::int`,
        })
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.companyId, companyId)),
      db
        .select({
          pendingRetries: sql<number>`COUNT(*) FILTER (
          WHERE ${webhookDeliveries.deliveredAt} IS NULL
          AND ${webhookDeliveries.nextRetryAt} IS NOT NULL
        )::int`,
          failed: sql<number>`COUNT(*) FILTER (
          WHERE ${webhookDeliveries.deliveredAt} IS NULL
          AND ${webhookDeliveries.nextRetryAt} IS NULL
          AND ${webhookDeliveries.attemptCount} >= 5
        )::int`,
          delivered24h: sql<number>`COUNT(*) FILTER (
          WHERE ${webhookDeliveries.deliveredAt} >= ${dayAgoIso}
        )::int`,
          lastWebhookAt: sql<Date | null>`MAX(${webhookDeliveries.createdAt})`,
        })
        .from(webhookDeliveries)
        .innerJoin(
          webhookEndpoints,
          eq(webhookDeliveries.endpointId, webhookEndpoints.id),
        )
        .where(eq(webhookEndpoints.companyId, companyId)),
      db
        .select({
          pending: sql<number>`COUNT(*) FILTER (
          WHERE ${apiIdempotencyKeys.status} = 'pending'
        )::int`,
          completed24h: sql<number>`COUNT(*) FILTER (
          WHERE ${apiIdempotencyKeys.status} = 'completed'
          AND ${apiIdempotencyKeys.createdAt} >= ${dayAgoIso}
        )::int`,
          lastApiWriteAt: sql<Date | null>`MAX(${apiIdempotencyKeys.createdAt})`,
        })
        .from(apiIdempotencyKeys)
        .where(eq(apiIdempotencyKeys.companyId, companyId)),
    ]);

  const activeApiTokens = tokenRow?.value ?? 0;
  const activeWebhookEndpoints = endpointRow?.active ?? 0;
  const totalWebhookEndpoints = endpointRow?.total ?? 0;
  const pendingWebhookRetries = deliveryRow?.pendingRetries ?? 0;
  const failedWebhookDeliveries = deliveryRow?.failed ?? 0;
  const pendingIdempotencyKeys = idempotencyRow?.pending ?? 0;

  return {
    status: classifyIntegrationHealth({
      activeApiTokens,
      activeWebhookEndpoints,
      pendingWebhookRetries,
      failedWebhookDeliveries,
      pendingIdempotencyKeys,
    }),
    activeApiTokens,
    activeWebhookEndpoints,
    totalWebhookEndpoints,
    pendingWebhookRetries,
    failedWebhookDeliveries,
    deliveredWebhooks24h: deliveryRow?.delivered24h ?? 0,
    pendingIdempotencyKeys,
    completedIdempotencyKeys24h: idempotencyRow?.completed24h ?? 0,
    lastWebhookAt: deliveryRow?.lastWebhookAt ?? null,
    lastApiWriteAt: idempotencyRow?.lastApiWriteAt ?? null,
  };
}
