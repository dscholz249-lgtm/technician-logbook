"use server";

import { revalidatePath } from "next/cache";
import { markActioned, markIgnored } from "@/lib/api";
import { capture } from "@/lib/analytics";
import { resolveRequestAccess } from "./access";

type Result = { error?: string };

// Access is re-checked here, not trusted from the page render: a server
// action is its own endpoint and the link may have expired since.
async function act(
  kind: "complete" | "ignore",
  id: number,
  exp: string | undefined,
  sig: string | undefined,
): Promise<Result> {
  const access = await resolveRequestAccess(id, exp, sig);
  if (!access.ok) {
    return {
      error:
        access.link === "expired"
          ? "This link has expired. Sign in to the dashboard to continue."
          : "Sign in to the dashboard to act on this request.",
    };
  }

  try {
    if (kind === "complete") await markActioned(id, access.actor);
    else await markIgnored(id, access.actor);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }

  await capture(
    access.viaLink ? "slack-link" : access.actor,
    kind === "complete" ? "request_actioned" : "request_ignored",
    { item_id: id, via: access.viaLink ? "slack_link" : "request_page" },
  );
  revalidatePath(`/requests/${id}`);
  revalidatePath("/dashboard");
  return {};
}

export async function completeRequest(id: number, exp?: string, sig?: string): Promise<Result> {
  return act("complete", id, exp, sig);
}

export async function ignoreRequest(id: number, exp?: string, sig?: string): Promise<Result> {
  return act("ignore", id, exp, sig);
}
