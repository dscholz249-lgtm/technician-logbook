import { NextRequest, NextResponse } from "next/server";
import { sendLabsSnapshot, yesterdayUtc } from "@/lib/labs-snapshot";

/**
 * Daily metrics snapshot for the Labs Console.
 *
 * Hit once a day by a scheduler with `Authorization: Bearer $SYNC_SECRET`.
 * The snapshot itself lives in lib/labs-snapshot.ts, shared with the
 * Console's Update button (/api/labs/refresh).
 */

const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(req: NextRequest) {
  if (SYNC_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${SYNC_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await sendLabsSnapshot(yesterdayUtc());
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status: 503 },
    );
  }

  const s = result.snapshot;
  return NextResponse.json({
    request_activity: s.request_activity,
    request_activity_accepted: s.request_activity_sent?.ok ?? false,
    request_activity_status: s.request_activity_sent?.status ?? null,
    console_accepted: s.sent.ok,
    console_status: s.sent.status,
    console_response: s.sent.body,
    console_endpoint:
      process.env.LABS_CONSOLE_ENDPOINT ?? "(default — set explicitly if wrong)",
    as_of_date: s.as_of_date,
    total_users: s.total_users,
    breakdown: s.breakdown,
    dau: s.dau,
    mau: s.mau,
    last_active_at: s.last_active_at,
    activity_source: s.activity_source,
  }, { status: s.sent.ok ? 200 : 502 });
}
