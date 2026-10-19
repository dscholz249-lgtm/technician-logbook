import "server-only";
import { getCompanies } from "@/lib/supabase/db";
import { getLastActiveByPhones, getRequestActivity } from "@/lib/api";
import { labsEventReporting } from "@/lib/labs-console";

/**
 * Compute and send one day's Labs Console snapshot: `metrics.daily`, then
 * `metrics.activity.daily`. Shared by the scheduled run
 * (/api/internal/labs-metrics) and the Console's Update button
 * (/api/labs/refresh, PRD-426), so the two can never send different numbers.
 * Callers authorize.
 *
 * Reads from two places, which is why this is slower than a single-database
 * product's: Supabase for roster counts, the Express service for SMS activity.
 *
 * "Active" for the Logbook means an inbound SMS. Technicians never log in —
 * texting the bot is the entire interaction — so a login-based definition
 * would report zero forever. Each Labs product defines active for itself and
 * writes that definition into its Console registry description; this is ours.
 */

type Sent = Awaited<ReturnType<typeof labsEventReporting>>;

export type LabsSnapshot = {
  as_of_date: string;
  total_users: number;
  breakdown: Record<string, number>;
  dau: number | null;
  mau: number | null;
  last_active_at: string | null;
  activity_source: "express" | "unavailable";
  request_activity: Record<string, number> | null;
  sent: Sent;
  request_activity_sent: Sent | null;
};

export type LabsSnapshotResult =
  | { ok: true; snapshot: LabsSnapshot }
  | { ok: false; error: "supabase_unavailable"; detail: string };

/** Yesterday UTC, because a snapshot of a day still in progress is not a day. */
export function yesterdayUtc(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

export async function sendLabsSnapshot(asOfDate: string): Promise<LabsSnapshotResult> {
  let companies;
  try {
    companies = await getCompanies();
  } catch (err) {
    return { ok: false, error: "supabase_unavailable", detail: String(err) };
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
  // Latest inbound SMS from anyone, up to now — not capped at the end of
  // as_of_date. That is what makes the Update button useful between daily
  // runs: the Console's "last active" moves even though the day being
  // reported is still yesterday.
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
  let activitySent: Sent | null = null;

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
    console.warn("[labs-snapshot] request activity unavailable", err);
  }

  return {
    ok: true,
    snapshot: {
      as_of_date: asOfDate,
      total_users: totalUsers,
      breakdown,
      dau: activityAvailable ? dau : null,
      mau: activityAvailable ? mau : null,
      last_active_at: lastActiveAt,
      activity_source: activityAvailable ? "express" : "unavailable",
      request_activity: requestActivity,
      sent,
      request_activity_sent: activitySent,
    },
  };
}
