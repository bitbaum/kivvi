import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { companies, inventoryItems } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { buildWebhookSignature, parseRicardoWebhookEvent } from "@kivvi/core/src/domain/ricardo";

async function resolveCompanyIdBySignature(
  rawBody: string,
  signature: string | null,
): Promise<string | null> {
  if (!signature) return null;

  const rows = await db
    .select({ id: companies.id, settings: companies.settings })
    .from(companies)
    .where(sql`${companies.settings}->>'ricardoApiKey' IS NOT NULL`);

  for (const row of rows) {
    const settings = (row.settings as CompanySettings | undefined) ?? {};
    if (!settings.ricardoApiKey) continue;
    const expected = buildWebhookSignature(settings.ricardoApiKey, rawBody);
    if (expected === signature) return row.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-ricardo-signature");

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = parseRicardoWebhookEvent(body);
  if (!event) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const verifiedCompanyId = await resolveCompanyIdBySignature(rawBody, signature);
  if (signature && !verifiedCompanyId) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const [item] = await db
      .select({ id: inventoryItems.id, companyId: inventoryItems.companyId })
      .from(inventoryItems)
      .where(
        verifiedCompanyId
          ? and(
              eq(inventoryItems.externalListingId, event.listingId),
              eq(inventoryItems.companyId, verifiedCompanyId),
            )
          : eq(inventoryItems.externalListingId, event.listingId),
      )
      .limit(1);

    if (!item) {
      return NextResponse.json({ received: true, matched: false });
    }

    if (event.eventType === "bid_placed") {
      return NextResponse.json({ received: true, matched: true });
    }

    const statusMap: Record<string, string> = {
      item_sold: "sold",
      item_expired: "expired",
      item_removed: "removed",
    };

    const nextListingStatus = statusMap[event.eventType];
    await db
      .update(inventoryItems)
      .set({
        externalListingStatus: nextListingStatus,
        ...(event.eventType === "item_sold"
          ? { status: "sold", soldPrice: event.soldPrice ?? undefined }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.companyId, item.companyId)));

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    logger.error("Ricardo webhook handler failed", error, {
      listingId: event.listingId,
      eventType: event.eventType,
    });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
