// The Labs Console's Update button (PRD-426), matching Assessments and
// Pre-Hire (PRD-370).
//
// Runs the same send as the scheduled /api/internal/labs-metrics — yesterday's
// snapshot, re-sent with a last_active_at as of now — when the Console asks.
// The Console signs the request with the product's shared secret, the same one
// we sign our events to it with (lib/labs-console.ts labsRequestAuthorized),
// so SYNC_SECRET never leaves this app.
//
//   POST /api/labs/refresh   X-Labs-Product, X-Labs-Timestamp, X-Labs-Signature
//
// The Console reads `as_of_date`, `sent.ok` and `metrics.last_active_at` from
// the response.

import { NextResponse, type NextRequest } from "next/server";
import { labsRequestAuthorized } from "@/lib/labs-console";
import { sendLabsSnapshot, yesterdayUtc } from "@/lib/labs-snapshot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!process.env.LABS_CONSOLE_PRODUCT_ID || !process.env.LABS_CONSOLE_SECRET) {
    return NextResponse.json({ ok: false, error: "labs console not configured" }, { status: 503 });
  }
  // Signed over the raw bytes, so read them before anything parses the body.
  const rawBody = await req.text();
  if (!labsRequestAuthorized(req.headers, rawBody)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await sendLabsSnapshot(yesterdayUtc());
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, detail: result.detail },
      { status: 503 },
    );
  }

  // The send is reported, not thrown on: a 2xx with sent.ok false tells the
  // Console we computed the numbers but couldn't deliver them, which it shows
  // as its own message.
  const s = result.snapshot;
  return NextResponse.json({
    ok: true,
    as_of_date: s.as_of_date,
    sent: { ok: s.sent.ok, status: s.sent.status },
    activity_sent: s.request_activity_sent
      ? { ok: s.request_activity_sent.ok, status: s.request_activity_sent.status }
      : null,
    metrics: {
      total_users: s.total_users,
      dau: s.dau,
      mau: s.mau,
      last_active_at: s.last_active_at,
      breakdown: s.breakdown,
    },
  });
}
