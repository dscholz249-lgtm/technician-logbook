import { NextRequest, NextResponse } from "next/server";
import { getCompanies } from "@/lib/supabase/db";
import { getLastActiveByPhones, getRequestActivity } from "@/lib/api";
import { labsEventReporting } from "@/lib/labs-console";

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

  // The Logbook's own cut of its users. "235 users" is true and says nothing
  // about a product whose whole shape is a few managers to many technicians
  // across a handful of companies. The Console renders these as given — they
  // are not required to add up to total_users, which is why Companies can sit
  // alongside people without being wrong.
  const breakdown: Record<string, number> = {
    Companies: companies.length,
    Managers: managers.filter((m) => (m.role ?? "manager") === "manager").length,
    Directors: managers.filter((m) => m.role === "director").length,
    Technicians: technicians.length,
  };

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

  const sent = await labsEventReporting("metrics.daily", {
    as_of_date: asOfDate,
    total_users: totalUsers,
    ...(activityAvailable ? { dau, mau } : {}),
    ...(lastActiveAt ? { last_active_at: lastActiveAt } : {}),
    breakdown,
  });

  // Request volume by category (PRD-274), as its own event rather than a field
  // on metrics.daily: metrics_daily.breakdown is user composition, and these
  // are counts of things done, not people. A separate event also means a
  // failure here cannot cost us the user snapshot above, which is why it is
  // sent second and reported separately.
  //
  // A day with no activity sends explicit zeros. Omitting the event would be
  // indistinguishable from the cron not running, and the Console's rule is
  // that a missing metric reads as unwired rather than quiet.
  // Sent as a {label: count} map rather than named fields, matching what
  // metrics.daily already does with `breakdown`: the Console stores the
  // labels we choose and never learns what they mean, so adding a category
  // here costs nothing on its side.
  let requestActivity: Record<string, number> | null = null;
  let activitySent: Awaited<ReturnType<typeof labsEventReporting>> | null = null;

  try {
    const daily = await getRequestActivity();
    const row = daily.find((d) => d.date === asOfDate);
    requestActivity = {
      Images: row?.images ?? 0,
      "Curriculum lookups": row?.curriculum ?? 0,
      "Other requests": row?.other ?? 0,
    };
    activitySent = await labsEventReporting("metrics.activity.daily", {
      as_of_date: asOfDate,
      activity: requestActivity,
    });
  } catch (err) {
    console.warn("[labs-metrics] request activity unavailable", err);
  }

  return NextResponse.json({
    request_activity: requestActivity,
    request_activity_accepted: activitySent?.ok ?? false,
    request_activity_status: activitySent?.status ?? null,
    console_accepted: sent.ok,
    console_status: sent.status,
    console_response: sent.body,
    console_endpoint:
      process.env.LABS_CONSOLE_ENDPOINT ?? "(default — set explicitly if wrong)",
    as_of_date: asOfDate,
    total_users: totalUsers,
    breakdown,
    dau: activityAvailable ? dau : null,
    mau: activityAvailable ? mau : null,
    last_active_at: lastActiveAt,
    activity_source: activityAvailable ? "express" : "unavailable",
  }, { status: sent.ok ? 200 : 502 });
}
