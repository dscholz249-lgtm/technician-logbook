import "server-only";
import { PostHog } from "posthog-node";

function makeClient() {
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  return new PostHog(key, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}

// One client per module load (long-lived Next.js server process)
const client = makeClient();

export async function capture(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
) {
  if (!client) return;
  client.capture({ distinctId, event, properties });
  await client.flush();
}
