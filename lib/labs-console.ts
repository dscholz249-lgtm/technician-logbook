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
  | "metrics.daily"
  // Request volume by category (PRD-274). The Console stores unknown event
  // types and ignores them until it ships support, so emitting this before
  // the Console renders it loses nothing — the events are already in its
  // `events` table when the reader lands.
  | "metrics.activity.daily";

/**
 * The product id and shared secret, trimmed. Production's product id was
 * pasted into Railway with a trailing newline: outbound events never noticed
 * (fetch strips header whitespace), but comparing it against the id the
 * Console sends us failed every time. Read them only through here.
 */
export function labsCredentials(): { productId: string; secret: string } | null {
  const productId = process.env.LABS_CONSOLE_PRODUCT_ID?.trim();
  const secret = process.env.LABS_CONSOLE_SECRET?.trim();
  return productId && secret ? { productId, secret } : null;
}

export async function labsEvent(
  eventType: LabsEventType,
  data: unknown,
  opts?: { occurredAt?: string; eventId?: string },
): Promise<void> {
  const creds = labsCredentials();
  if (!creds) return;
  const { productId, secret } = creds;

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
 * Same send, but reports what the Console actually said.
 *
 * `labsEvent` swallowing is correct in a user path and useless in an
 * admin-invoked one: a route that returns 200 having silently had its event
 * rejected is indistinguishable from one that worked, which is exactly the
 * hole you fall into when nothing shows up in the Console. Internal routes use
 * this instead so the status code is visible.
 */
export async function labsEventReporting(
  eventType: LabsEventType,
  data: unknown,
  opts?: { occurredAt?: string; eventId?: string },
): Promise<{ ok: boolean; status: number | null; body: string }> {
  const creds = labsCredentials();
  if (!creds) {
    return {
      ok: false,
      status: null,
      body: "LABS_CONSOLE_PRODUCT_ID or LABS_CONSOLE_SECRET is not set on this deploy",
    };
  }
  const { productId, secret } = creds;

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
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Labs-Product": productId,
        "X-Labs-Timestamp": ts,
        "X-Labs-Signature": `v1=${sig}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return {
      ok: res.status === 202 || res.status === 200,
      status: res.status,
      body: await res.text(),
    };
  } catch (err) {
    return { ok: false, status: null, body: String(err) };
  }
}

// How far a Console request's timestamp may sit from our clock. Same window
// as Assessments; it bounds how long a captured request could be replayed.
const REQUEST_TOLERANCE_SECONDS = 300;

/**
 * Verifies a request the Console sends us — its Update button (PRD-426). The
 * Console signs with this product's shared secret, the same way we sign our
 * events to it: `v1=` + HMAC-SHA256 over `${timestamp}.${rawBody}`. So no
 * extra credential is needed, and a rotated secret works for both directions
 * once deployed. Pass the raw body text, before anything parses it.
 */
export function labsRequestAuthorized(headers: Headers, rawBody: string): boolean {
  const creds = labsCredentials();
  if (!creds) return false;
  const { productId, secret } = creds;
  if (headers.get("x-labs-product") !== productId) return false;

  const ts = headers.get("x-labs-timestamp") ?? "";
  const tsNum = Number(ts);
  if (
    !/^\d+$/.test(ts) ||
    Math.abs(Math.floor(Date.now() / 1000) - tsNum) > REQUEST_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected = Buffer.from(
    "v1=" + crypto.createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex"),
  );
  const provided = Buffer.from(headers.get("x-labs-signature") ?? "");
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
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
