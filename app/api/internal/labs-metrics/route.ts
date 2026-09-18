import { NextRequest, NextResponse } from "next/server";
import { getCompanies } from "@/lib/supabase/db";
import { getLastActiveByPhones } from "@/lib/api";
import { labsEvent } from "@/lib/labs-console";

/**
 * Daily metrics snapshot for the Labs Console.
 *
 * Hit once a day by a scheduler with `Authorization: Bearer $SYNC_SECRET`.
 * Reads from two places, which is why this job is slower than a single-database
 * product's: Supabase for roster counts, the Express service for SMS activity.
 *
 * "Active" for the Logbook means an inbound SMS. Technicians never log in —
 * texting the bot is the entire interaction — so a login-based definition
 * would report zero forever. Each Labs product defines active for itself and
 * writes that definition into its Console registry description; this is ours.
 */

const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(req: NextRequest) {
  if (SYNC_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${SYNC_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // Yesterday, because a snapshot of a day still in progress is not a day.
  const asOf = new Date(Date.now() - 86_400_000);
  const asOfDate = asOf.toISOString().slice(0, 10);

  let companies;
  try {
    companies = await getCompanies();
  } catch (err) {
    return NextResponse.json(
      { error: "supabase_unavailable", detail: String(err) },
      { status: 503 },
    );
  }

  const managers = companies.flatMap((c) => c.managers ?? []);
  const technicians = companies.flatMap((c) => c.technicians ?? []);
  const totalUsers = managers.length + technicians.length;

  const phones = [
    ...managers.map((m) => m.phone),
    ...technicians.map((t) => t.phone),
  ].filter((p): p is string => Boolean(p));

  // Activity is best-effort. If Express is down we still report the roster
  // count rather than nothing — a partial snapshot beats a gap in the series,
  // and dau/mau are optional fields precisely for this case.
  let lastActive: Record<string, string> = {};
  let activityAvailable = true;
  try {
    lastActive = await getLastActiveByPhones(phones);
  } catch {
    activityAvailable = false;
  }

  const dayStart = Date.parse(`${asOfDate}T00:00:00Z`);
  const dayEnd = dayStart + 86_400_000;
  const monthStart = dayEnd - 30 * 86_400_000;

  let dau = 0;
  let mau = 0;
  let lastActiveAt: string | null = null;

  for (const iso of Object.values(lastActive)) {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) continue;
    if (t >= dayStart && t < dayEnd) dau++;
    if (t >= monthStart && t < dayEnd) mau++;
    if (!lastActiveAt || t > Date.parse(lastActiveAt)) lastActiveAt = iso;
  }

  await labsEvent("metrics.daily", {
    as_of_date: asOfDate,
    total_users: totalUsers,
    ...(activityAvailable ? { dau, mau } : {}),
    ...(lastActiveAt ? { last_active_at: lastActiveAt } : {}),
  });

  return NextResponse.json({
    as_of_date: asOfDate,
    total_users: totalUsers,
    managers: managers.length,
    technicians: technicians.length,
    dau: activityAvailable ? dau : null,
    mau: activityAvailable ? mau : null,
    last_active_at: lastActiveAt,
    activity_source: activityAvailable ? "express" : "unavailable",
  });
}
