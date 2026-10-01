import "server-only";
import { getManagerByEmail, getTechnicianByEmail } from "@/lib/supabase/db";
import { isAdmin } from "@/lib/env";

/**
 * Where a signed-in address belongs, or null if it belongs nowhere.
 *
 * Two callers need this answer and must not disagree: the auth callback,
 * which sends someone there after sign-in, and the public landing page, whose
 * CTA has to point at the same place or it lands them somewhere they cannot
 * use. It lived only in the callback until the landing page needed it.
 *
 * Null means "signed in but not on any roster" — the callback treats that as
 * a failed sign-in and signs them back out, while the landing page just shows
 * the ordinary logged-out CTA. Same question, different consequences, so the
 * handling stays with each caller rather than being decided here.
 *
 * Order matters: an admin who is also on a company roster gets the admin
 * dashboard, which is what the callback has always done.
 */
export type HomePath = "/dashboard" | "/manager" | "/tech";

export async function resolveHomePath(email: string): Promise<HomePath | null> {
  if (isAdmin(email)) return "/dashboard";

  const manager = await getManagerByEmail(email).catch(() => null);
  if (manager) return "/manager";

  const technician = await getTechnicianByEmail(email).catch(() => null);
  if (technician) return "/tech";

  return null;
}
