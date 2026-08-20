"use server";

import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getTechnicianByEmail } from "@/lib/supabase/db";
import { env, isAdmin } from "@/lib/env";

export async function sendMagicLink(
  email: string,
): Promise<{ error?: string }> {
  const normalized = email.trim().toLowerCase();

  const userIsAdmin = isAdmin(normalized);
  const manager = userIsAdmin ? null : await getManagerByEmail(normalized).catch(() => null);
  const technician = (!userIsAdmin && !manager) ? await getTechnicianByEmail(normalized).catch(() => null) : null;

  if (!userIsAdmin && !manager && !technician) {
    return { error: "Email not recognized. Contact your SkillCat administrator." };
  }

  const redirectTo = `${env.PUBLIC_ORIGIN}/auth/callback`;
  console.log("[sign-in] emailRedirectTo:", redirectTo, "role:", userIsAdmin ? "admin" : "manager");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    const msg = error.message && error.message !== "{}" ? error.message : "Failed to send magic link. Check your email configuration.";
    return { error: msg };
  }
  return {};
}
