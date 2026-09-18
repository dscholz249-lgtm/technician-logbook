/**
 * One-time backfill of the existing roster into the Labs Console.
 *
 * Run from the repo root — it imports @supabase/supabase-js, so node has to be
 * able to see this project's node_modules:
 *
 *   cd /path/to/skillcat-technician-logbook
 *   node --env-file=.env.local scripts/labs-backfill.mjs --dry-run
 *
 * --env-file needs the four LABS_CONSOLE_* / Supabase vars in .env.local. To
 * pass them inline instead:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *   LABS_CONSOLE_PRODUCT_ID=… LABS_CONSOLE_SECRET=… \
 *   LABS_CONSOLE_ENDPOINT=https://<console>/v1/events \
 *   node scripts/labs-backfill.mjs [--dry-run]
 *
 * There is no import endpoint: backfill is ordinary user.registered events in
 * arrays of up to 500. event_id is a deterministic hash of product + external
 * id, so re-running after a failure is free rather than duplicating — a script
 * that dies halfway can just be run again.
 *
 * The Logbook is the row worth proving first: its technicians are
 * phone-identified and many have no email at all, so if this lands cleanly the
 * Console's phone-identifier path is proven and the other products are easier.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRODUCT_ID = process.env.LABS_CONSOLE_PRODUCT_ID;
const SECRET = process.env.LABS_CONSOLE_SECRET;
const ENDPOINT = process.env.LABS_CONSOLE_ENDPOINT;

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  LABS_CONSOLE_PRODUCT_ID: PRODUCT_ID,
  LABS_CONSOLE_SECRET: SECRET,
  LABS_CONSOLE_ENDPOINT: ENDPOINT,
})) {
  if (!value) {
    console.error(
      `Missing ${name}.\n\n` +
        "Run from the repo root with the env file loaded:\n" +
        "  node --env-file=.env.local scripts/labs-backfill.mjs --dry-run\n\n" +
        "LABS_CONSOLE_PRODUCT_ID and LABS_CONSOLE_SECRET come from the Console's\n" +
        "product page; LABS_CONSOLE_ENDPOINT is that Console's /v1/events URL.",
    );
    process.exit(1);
  }
}

/** Must match lib/labs-console.ts — a mismatch would create parallel people. */
function technicianExternalId(companyId, row) {
  const email = row.email?.trim().toLowerCase();
  if (email) return `${companyId}:email:${email}`;
  const phone = row.phone?.replace(/\D/g, "");
  if (phone) return `${companyId}:phone:${phone}`;
  const name = row.name?.trim().toLowerCase().replace(/\s+/g, "-") ?? "unknown";
  return `${companyId}:name:${name}`;
}

function deterministicEventId(externalUserId) {
  return crypto
    .createHash("sha256")
    .update(`${PRODUCT_ID}:${externalUserId}`)
    .digest("hex")
    .slice(0, 32);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const { data: managers, error: mErr } = await db
  .from("managers")
  .select("*")
  .is("deleted_at", null);
if (mErr) throw mErr;

const { data: technicians, error: tErr } = await db.from("technicians").select("*");
if (tErr) throw tErr;

const envelopes = [];

for (const m of managers ?? []) {
  if (!m.email && !m.phone) continue; // unresolvable to a person
  envelopes.push({
    event_id: deterministicEventId(m.id),
    event_type: "user.registered",
    // The original signup time, not now — the Console orders by occurred_at.
    occurred_at: new Date(m.created_at ?? Date.now()).toISOString(),
    product_id: PRODUCT_ID,
    data: {
      external_user_id: m.id,
      email: m.email,
      phone: m.phone,
      name: m.name,
      role: m.role ?? "manager",
    },
  });
}

let skippedTechs = 0;
for (const t of technicians ?? []) {
  if (!t.email && !t.phone) {
    // No email and no phone means there is no identifier to resolve a person
    // from. These are real roster rows but the Console cannot key them, so
    // they are reported in total_users by metrics.daily and nowhere else.
    skippedTechs++;
    continue;
  }
  const externalId = technicianExternalId(t.company_id, t);
  envelopes.push({
    event_id: deterministicEventId(externalId),
    event_type: "user.registered",
    occurred_at: new Date(t.created_at ?? Date.now()).toISOString(),
    product_id: PRODUCT_ID,
    data: {
      external_user_id: externalId,
      email: t.email,
      phone: t.phone,
      name: t.name,
      role: "technician",
    },
  });
}

console.log(
  `managers ${managers?.length ?? 0} · technicians ${technicians?.length ?? 0}\n` +
    `sending ${envelopes.length} events` +
    (skippedTechs ? `, skipping ${skippedTechs} technician(s) with no email or phone` : ""),
);

if (DRY) {
  console.log("\n--dry-run, nothing sent. First envelope:");
  console.log(JSON.stringify(envelopes[0], null, 2));
  process.exit(0);
}

async function postBatch(batch) {
  const body = JSON.stringify(batch);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Labs-Product": PRODUCT_ID,
      "X-Labs-Timestamp": ts,
      "X-Labs-Signature": `v1=${sig}`,
    },
    body,
  });
  return { status: res.status, body: await res.text() };
}

for (let i = 0; i < envelopes.length; i += 500) {
  const batch = envelopes.slice(i, i + 500);
  const { status, body } = await postBatch(batch);
  const ok = status === 202 || status === 200;
  console.log(`${ok ? "✓" : "✗"} batch ${i / 500 + 1}  ${status}  ${body}`);
  if (!ok) {
    console.error("Stopping. Re-running after a fix is safe — event ids are deterministic.");
    process.exit(1);
  }
}

console.log("\nDone. Check the Console's product page for the membership count.");
