export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retryFailedDeliveries } from "@kivvi/core/src/domain/webhooks";
import { logger } from "@/lib/logger";

/**
 * Cron endpoint for retrying failed webhook deliveries.
 * Run every 5 minutes via Vercel Cron (see vercel.json).
 * Picks up deliveries where nextRetryAt <= now and re-attempts them.
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await retryFailedDeliveries(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Webhook retry cron failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
