import "server-only";
import { env } from "./env";

async function post(url: string, payload: object): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[slack] webhook failed", (e as Error).message);
  }
}

/** #logbook-requests, in the original format. */
export async function notifySlack(blocks: object[]): Promise<void> {
  const url = env.SLACK_WEBHOOK_URL;
  if (!url) return;
  await post(url, { blocks });
}

/**
 * #experiment-notifications: the same notification spelled out — what kind
 * it is, what to do about it, and a link to the dashboard section — with an
 * @-mention so it pings. Sent alongside notifySlack, not instead of it.
 */
export async function notifyExperimentChannel(n: ExperimentNotification): Promise<void> {
  const url = env.SLACK_EXPERIMENT_WEBHOOK_URL;
  if (!url) return;
  await post(url, experimentPayload(n, env.SLACK_MENTION_USER_ID));
}

export type ExperimentNotification = {
  /** "Urgent Request", "Interest Request" or "Request". */
  kind: "Urgent Request" | "Interest Request" | "Request";
  emoji: string;
  /** Short subject after the kind, e.g. "Four Seasons Plumbing". */
  subject: string;
  fields: [label: string, value: string | null][];
  /** One or two sentences: what to do, in order. */
  todo: string;
  link: { url: string; label: string };
};

// Kept in step with experimentBlocks() in skillcat-sms-miniapp/lib/slack.js,
// which sends the "Request" kind.
function experimentPayload(n: ExperimentNotification, mentionId: string): object {
  const headline = `${n.emoji} *${n.kind}* · ${n.subject}`;
  return {
    // Top-level text is what the push notification and the mention use;
    // blocks are what the channel shows.
    text: `<@${mentionId}> ${n.kind}: ${n.subject}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `<@${mentionId}> ${headline}` } },
      {
        type: "section",
        fields: n.fields.map(([label, value]) => ({
          type: "mrkdwn",
          text: `*${label}*\n${value || "—"}`,
        })),
      },
      { type: "section", text: { type: "mrkdwn", text: `*What to do*\n${n.todo}` } },
      { type: "section", text: { type: "mrkdwn", text: `<${n.link.url}|${n.link.label} →>` } },
    ],
  };
}

export function urgentExperimentNotification(opts: {
  managerName: string;
  managerEmail: string;
  companyName: string;
  message: string;
}): ExperimentNotification {
  return {
    kind: "Urgent Request",
    emoji: ":rotating_light:",
    subject: `${opts.managerName}, ${opts.companyName}`,
    fields: [
      ["From", `${opts.managerName} · ${opts.managerEmail}`],
      ["Company", opts.companyName],
      ["Message", opts.message],
    ],
    todo:
      `${opts.managerName} flagged this as urgent from the Logbook. Contact them today ` +
      `at ${opts.managerEmail}, sort out what they need, then click *Mark resolved* in Urgent Requests.`,
    link: { url: `${env.PUBLIC_ORIGIN}/dashboard/urgent-requests`, label: "Open Urgent Requests" },
  };
}

export function interestExperimentNotification(opts: {
  name: string;
  email: string;
  companyName: string | null;
  teamSize: string | null;
}): ExperimentNotification {
  const who = opts.companyName ? `${opts.name} at ${opts.companyName}` : opts.name;
  return {
    kind: "Interest Request",
    emoji: ":wave:",
    subject: who,
    fields: [
      ["Name", opts.name],
      ["Email", opts.email],
      ["Company", opts.companyName],
      ["Team size", opts.teamSize],
    ],
    todo:
      `${who} filled in the interest form on the Logbook site. Email them at ${opts.email} ` +
      `to set up a call, then set their status to *Contacted* in Interest.`,
    link: { url: `${env.PUBLIC_ORIGIN}/dashboard/interest`, label: "Open Interest" },
  };
}

export function interestRequestBlocks(opts: {
  name: string;
  email: string;
  companyName: string | null;
  teamSize: string | null;
}): object[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: ":wave: *New interest request*" },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name*\n${opts.name}` },
        { type: "mrkdwn", text: `*Email*\n${opts.email}` },
        { type: "mrkdwn", text: `*Company*\n${opts.companyName ?? "—"}` },
        { type: "mrkdwn", text: `*Team size*\n${opts.teamSize ?? "—"}` },
      ],
    },
  ];
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
