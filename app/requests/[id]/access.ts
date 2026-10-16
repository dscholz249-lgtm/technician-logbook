import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/env";
import { checkRequestLink, SLACK_LINK_ACTOR, type RequestLinkCheck } from "@/lib/request-link";

// Who is acting on a request opened from a Slack "Mark complete" link.
// A signed-in admin acts as themselves (even when the link is also present),
// so completions stay attributed to a person wherever possible. Otherwise a
// valid signed link stands in for sign-in, scoped to this one request.
export type RequestAccess =
  | { ok: true; actor: string; viaLink: boolean }
  | { ok: false; link: RequestLinkCheck };

export async function resolveRequestAccess(
  id: number,
  exp: string | undefined,
  sig: string | undefined,
): Promise<RequestAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email && isAdmin(user.email)) {
    return { ok: true, actor: user.email, viaLink: false };
  }

  const link = checkRequestLink(id, exp, sig);
  if (link === "valid") return { ok: true, actor: SLACK_LINK_ACTOR, viaLink: true };
  return { ok: false, link };
}
