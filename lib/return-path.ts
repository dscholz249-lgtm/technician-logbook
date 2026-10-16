import "server-only";
import { cookies } from "next/headers";

// Where to send an admin after sign-in when they started from a deep link
// (e.g. an expired Slack "Mark complete" link). Carried in a short-lived
// cookie rather than on the magic link's redirect URL, so the Supabase
// redirect allowlist doesn't need to change. If the magic link is opened in a
// different browser the cookie isn't there and sign-in lands on the normal
// home page.

const COOKIE = "logbook_return_to";
const MAX_AGE_SECONDS = 60 * 60; // matches the magic link's 1-hour expiry

// Only same-site paths into admin pages. Rejects protocol-relative and
// backslash tricks that browsers would resolve to another origin.
export function safeReturnPath(path: string | null | undefined): string | null {
  if (!path || path.length > 200) return null;
  if (path.includes("//") || path.includes("\\")) return null;
  return /^\/(requests|dashboard)(\/[\w\-/]*)?$/.test(path) ? path : null;
}

export async function rememberReturnPath(path: string | null | undefined): Promise<void> {
  const safe = safeReturnPath(path);
  if (!safe) return;
  (await cookies()).set(COOKIE, safe, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

// Reads and clears the remembered path.
export async function takeReturnPath(): Promise<string | null> {
  const store = await cookies();
  const value = safeReturnPath(store.get(COOKIE)?.value);
  store.delete(COOKIE);
  return value;
}
