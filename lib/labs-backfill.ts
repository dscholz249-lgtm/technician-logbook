import "server-only";
import crypto from "node:crypto";
import { getCompanies } from "@/lib/supabase/db";
import { technicianExternalId } from "@/lib/labs-console";

/**
 * One-time load of the existing roster into the Labs Console.
 *
 * There is no import endpoint on the Console: backfill is ordinary
 * user.registered events in arrays of up to 500. Event ids are a deterministic
 * hash of product + external id, so re-running after a failure is free rather
 * than duplicating — a run that dies halfway can just be run again.
 *
 * This lives in the app rather than a local script because the app already has
 * the Supabase service-role key and the Console credentials in its own
 * environment. A product owner should never have to assemble five env vars on
 * a laptop to integrate.
 */

type Envelope = {
  event_id: string;
  event_type: "user.registered";
  occurred_at: string;
  product_id: string;
  data: Record<string, unknown>;
};

export type BackfillResult = {
  dryRun: boolean;
  managers: number;
  technicians: number;
  sending: number;
  skippedNoIdentifier: number;
  batches: { status: number; body: string }[];
  sample?: Envelope;
};

function deterministicEventId(productId: string, externalUserId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${productId}:${externalUserId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function runLabsBackfill(
  opts: { dryRun?: boolean } = {},
): Promise<BackfillResult> {
  const productId = process.env.LABS_CONSOLE_PRODUCT_ID;
  const secret = process.env.LABS_CONSOLE_SECRET;
  const endpoint =
    process.env.LABS_CONSOLE_ENDPOINT ||
    "https://product-experiment-console-production.up.railway.app/v1/events";

  if (!productId || !secret) {
    throw new Error(
      "LABS_CONSOLE_PRODUCT_ID and LABS_CONSOLE_SECRET are not set on this deploy",
    );
  }

  const companies = await getCompanies();
  const managers = companies.flatMap((c) => c.managers ?? []);
  const technicians = companies.flatMap((c) => c.technicians ?? []);

  const envelopes: Envelope[] = [];
  let skippedNoIdentifier = 0;

  for (const m of managers) {
    if (!m.email && !m.phone) {
      skippedNoIdentifier++;
      continue;
    }
    envelopes.push({
      event_id: deterministicEventId(productId, m.id),
      event_type: "user.registered",
      // The original signup time, not now — the Console orders by occurred_at.
      occurred_at: new Date(m.created_at ?? Date.now()).toISOString(),
      product_id: productId,
      data: {
        external_user_id: m.id,
        email: m.email,
        phone: m.phone,
        name: m.name,
        role: m.role ?? "manager",
      },
    });
  }

  for (const t of technicians) {
    // No email and no phone means no identifier to resolve a person from.
    // These are real roster rows the Console cannot key, so they appear in
    // total_users via metrics.daily and nowhere else.
    if (!t.email && !t.phone) {
      skippedNoIdentifier++;
      continue;
    }
    const externalId = technicianExternalId(t.company_id, t);
    envelopes.push({
      event_id: deterministicEventId(productId, externalId),
      event_type: "user.registered",
      occurred_at: new Date(t.created_at ?? Date.now()).toISOString(),
      product_id: productId,
      data: {
        external_user_id: externalId,
        email: t.email,
        phone: t.phone,
        name: t.name,
        role: "technician",
      },
    });
  }

  const result: BackfillResult = {
    dryRun: Boolean(opts.dryRun),
    managers: managers.length,
    technicians: technicians.length,
    sending: envelopes.length,
    skippedNoIdentifier,
    batches: [],
    sample: envelopes[0],
  };

  if (opts.dryRun) return result;

  for (let i = 0; i < envelopes.length; i += 500) {
    const batch = envelopes.slice(i, i + 500);
    const body = JSON.stringify(batch);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = crypto
      .createHmac("sha256", secret)
      .update(`${ts}.${body}`)
      .digest("hex");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Labs-Product": productId,
        "X-Labs-Timestamp": ts,
        "X-Labs-Signature": `v1=${sig}`,
      },
      body,
    });

    result.batches.push({ status: res.status, body: await res.text() });

    // Stop on the first failure rather than hammering a Console that is
    // rejecting us. Re-running is safe, so there is nothing to lose by halting.
    if (res.status !== 202 && res.status !== 200) break;
  }

  return result;
}
