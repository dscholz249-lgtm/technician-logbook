import "server-only";
import { NextResponse, type NextRequest } from "next/server";

/** Gate for /api/internal/* routes the Express SMS server calls: the shared
 *  SYNC_SECRET bearer token. Returns an error response, or null when allowed. */
export function rejectUnlessInternal(req: NextRequest): NextResponse | null {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SYNC_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
