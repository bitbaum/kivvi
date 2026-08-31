import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getAIHealth } from "@kivvi/ai";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for load balancers, uptime monitors, and container orchestration.
 * Returns 200 when the app and database are reachable, 503 otherwise.
 *
 * `ai` is reported for visibility only and never flips the top-level status
 * or the HTTP code — a dead provider key is not fixed by a restart, so it
 * must never fail whatever check this route feeds into a kill-and-restart
 * decision for. Something that actually cares about the AI layer specifically
 * should read `ai.status` from the body, not this endpoint's status code.
 */
export async function GET() {
  const start = Date.now();
  const ai = getAIHealth();

  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      db: "ok",
      ai,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        ai,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
