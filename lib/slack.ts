import "server-only";
import { env } from "./env";

export async function notifySlack(blocks: object[]): Promise<void> {
  const url = env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
      cache: "no-store",
      // @ts-expect-error — AbortSignal.timeout available at runtime
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[slack] webhook failed", (e as Error).message);
  }
}

export function urgentRequestBlocks(opts: {
  managerName: string;
  companyName: string;
  message: string;
}): object[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: ":rotating_light: *Urgent help request*" },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*From*\n${opts.managerName}` },
        { type: "mrkdwn", text: `*Company*\n${opts.companyName}` },
        { type: "mrkdwn", text: `*Message*\n${opts.message}` },
      ],
    },
  ];
}
