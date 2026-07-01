"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function sendMagicLink(
  email: string,
): Promise<{ error?: string }> {
  const redirectTo = `${env.PUBLIC_ORIGIN}/auth/callback`;
  console.log("[sign-in] emailRedirectTo:", redirectTo);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { error: error.message };
  return {};
}
