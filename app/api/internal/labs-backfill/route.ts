import { NextRequest, NextResponse } from "next/server";
import { runLabsBackfill } from "@/lib/labs-backfill";

/**
 * One-time roster load into the Labs Console.
 *
 *   curl -X POST "https://<this-app>/api/internal/labs-backfill?dry_run=1" \
 *     -H "Authorization: Bearer $SYNC_SECRET"
 *
 * Drop dry_run to actually send. Safe to run more than once: event ids are
 * deterministic, so the Console returns 200 duplicate rather than creating a
 * second membership.
 *
 * Runs here rather than from a laptop because this deploy already holds the
 * Supabase service-role key and the Console credentials. Nobody should have to
 * copy a service-role key onto a local machine to integrate a product.
 */

const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(req: NextRequest) {
  if (SYNC_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${SYNC_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const dryRun =
    req.nextUrl.searchParams.get("dry_run") === "1" ||
    req.nextUrl.searchParams.get("dry_run") === "true";

  try {
    const result = await runLabsBackfill({ dryRun });
    const failed = result.batches.find((b) => b.status !== 202 && b.status !== 200);
    return NextResponse.json(result, { status: failed ? 502 : 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "backfill_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
