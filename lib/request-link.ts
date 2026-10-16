import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// Verifies the signed "Mark complete" link the Express server puts in Slack
// request notifications. A valid link lets anyone holding it (SkillCat staff
// in the Slack channel) complete or ignore that one request without signing
// in, until it expires. Keep the message format in sync with
// lib/request-link.js in skillcat-sms-miniapp, which signs with its
// API_SECRET (== our EXPRESS_API_SECRET).

// Recorded as actioned_by when someone acts through the link without a
// dashboard session, since we can't know who clicked.
export const SLACK_LINK_ACTOR = "Slack link";

export type RequestLinkCheck = "valid" | "expired" | "invalid" | "missing";

export function checkRequestLink(
  id: number,
  exp: string | undefined,
  sig: string | undefined,
): RequestLinkCheck {
  if (!exp || !sig) return "missing";
  if (!/^\d+$/.test(exp)) return "invalid";

  const expected = createHmac("sha256", env.EXPRESS_API_SECRET)
    .update(`queue-link:v1:${id}:${exp}`)
    .digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return "invalid";
  }
  return Number(exp) * 1000 > Date.now() ? "valid" : "expired";
}
