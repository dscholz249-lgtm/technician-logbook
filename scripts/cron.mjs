/**
 * Railway cron entrypoint.
 *
 * Railway runs a cron service by executing its start command on a schedule, so
 * the job is a process that starts, does one thing, and exits. This POSTs to a
 * protected route on the app and exits non-zero on failure, which is what makes
 * a failed run visible in Railway's run history instead of silent.
 *
 * Set up as a SECOND service in the same Railway project, pointed at this same
 * repo:
 *
 *   Start command   node scripts/cron.mjs
 *   Cron schedule   0 7 * * *          (daily, 07:00 UTC)
 *   Variables       CRON_TARGET_URL    https://<app>/api/internal/deadman
 *                   CRON_SECRET        same value as the app service
 *
 * Zero dependencies on purpose: this has to run in a container that may not
 * have had `npm install` for anything but the app.
 */

const raw = process.env.CRON_TARGET_URL;
const secret = process.env.CRON_SECRET;

if (!raw) {
  console.error("[cron] CRON_TARGET_URL is not set — nothing to call.");
  process.exit(1);
}

// Railway shows service domains without a scheme, so the value pasted in is
// usually "app.up.railway.app/..." and fetch rejects that outright. There is
// no case where a scheme-less value here means anything other than https, so
// normalise it rather than failing a job a day until someone reads the log.
const target = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
if (target !== raw) {
  console.log(`[cron] CRON_TARGET_URL had no scheme — using ${target}`);
}

try {
  new URL(target);
} catch {
  console.error(
    `[cron] CRON_TARGET_URL is not a usable URL: ${raw}\n` +
      "[cron] Expected something like https://<app>.up.railway.app/api/internal/deadman",
  );
  process.exit(1);
}

const started = Date.now();
console.log(`[cron] POST ${target}`);

try {
  const res = await fetch(target, {
    method: "POST",
    headers: {
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      "Content-Type": "application/json",
    },
    // Generous: a digest walks every product, and a metrics job may read two
    // databases. Better to wait than to fail a job that was going to succeed.
    signal: AbortSignal.timeout(120_000),
  });

  const body = await res.text();
  const ms = Date.now() - started;
  console.log(`[cron] ${res.status} in ${ms}ms — ${body}`);

  // Exit non-zero on failure so Railway marks the run failed. A cron that
  // always reports success is the same problem as a swallowed error.
  process.exit(res.ok ? 0 : 1);
} catch (err) {
  console.error(`[cron] failed after ${Date.now() - started}ms —`, err);
  process.exit(1);
}
