import "server-only";
import crypto from "node:crypto";

/**
 * Reports to the SkillCat Labs Console.
 *
 * Three properties make this safe to call from anywhere in the app, and they
 * are the whole reason the Console cannot break the Logbook:
 *
 *   1. Unconfigured is a no-op, not an error. No env vars → returns silently,
 *      so a dev machine or a preview deploy behaves exactly like production.
 *   2. Failures are swallowed. A Console that is down, slow or misconfigured
 *      leaves the user's action completed and the Console merely wrong until
 *      the next metrics.daily corrects it.
 *   3. A 2s timeout. Without it, a hung Console becomes a hung request.
 *
 * Never call this before a transaction commits, and never await it in a path
 * a user is waiting on.
 */

const ENDPOINT =
  process.env.LABS_CONSOLE_ENDPOINT ||
  "https://product-experiment-console-production.up.railway.app/v1/events";

export type LabsEventType =
  | "user.registered"
  | "user.updated"
  | "user.removed"
  | "metrics.daily";

export async function labsEvent(
  eventType: LabsEventType,
  data: unknown,
  opts?: { occurredAt?: string; eventId?: string },
): Promise<void> {
  const productId = process.env.LABS_CONSOLE_PRODUCT_ID;
  const secret = process.env.LABS_CONSOLE_SECRET;
  if (!productId || !secret) return;

  const body = JSON.stringify({
    event_id: opts?.eventId ?? crypto.randomUUID(),
    event_type: eventType,
    occurred_at: opts?.occurredAt ?? new Date().toISOString(),
    product_id: productId,
    data,
  });

  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("hex");

  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Labs-Product": productId,
        "X-Labs-Timestamp": ts,
        "X-Labs-Signature": `v1=${sig}`,
      },
      body,
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    console.warn("[labs-console] event failed", eventType, err);
  }
}

/**
 * Fire without awaiting, for call sites inside a user-facing request. Keeps
 * the rule above literal: the caller does not wait, and a rejection cannot
 * escape into their path.
 */
export function labsEventDetached(
  eventType: LabsEventType,
  data: unknown,
  opts?: { occurredAt?: string; eventId?: string },
): void {
  void labsEvent(eventType, data, opts).catch(() => {});
}

/**
 * A technician's identity across a roster replace.
 *
 * `replaceTechnicians` deletes every row and reinserts, so `technicians.id` is
 * a different UUID after every roster save and cannot be the Console's
 * external_user_id — memberships would churn on each edit. This derives a
 * stable id from the most durable identifier the row actually has.
 *
 * Email first, then phone, then a slug of the name. The name fallback is the
 * weak one: renaming a technician with no email and no phone reads as a
 * different person. Fixing that properly means making replaceTechnicians
 * preserve row ids instead of delete-and-reinsert — worth doing, bigger change.
 */
export function technicianExternalId(
  companyId: string,
  row: { email?: string | null; phone?: string | null; name?: string | null },
): string {
  const email = row.email?.trim().toLowerCase();
  if (email) return `${companyId}:email:${email}`;

  const phone = row.phone?.replace(/\D/g, "");
  if (phone) return `${companyId}:phone:${phone}`;

  const name = row.name?.trim().toLowerCase().replace(/\s+/g, "-") ?? "unknown";
  return `${companyId}:name:${name}`;
}
