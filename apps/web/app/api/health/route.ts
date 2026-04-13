import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for load balancers, uptime monitors, and container orchestration.
 * Returns 200 when the app and database are reachable, 503 otherwise.
 */
export async function GET() {
  const start = Date.now();

  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      db: "ok",
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
