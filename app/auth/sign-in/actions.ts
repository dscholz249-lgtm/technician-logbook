"use server";

import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail } from "@/lib/supabase/db";
import { env } from "@/lib/env";

export async function sendMagicLink(
  email: string,
): Promise<{ error?: string }> {
  const normalized = email.trim().toLowerCase();

  const isAdmin = env.ADMIN_EMAILS.includes(normalized);
  const manager = isAdmin ? null : await getManagerByEmail(normalized).catch(() => null);

  if (!isAdmin && !manager) {
    return { error: "Email not recognized. Contact your SkillCat administrator." };
  }

  const redirectTo = `${env.PUBLIC_ORIGIN}/auth/callback`;
  console.log("[sign-in] emailRedirectTo:", redirectTo, "role:", isAdmin ? "admin" : "manager");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { error: error.message };
  return {};
}
