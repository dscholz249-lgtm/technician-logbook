"use server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function sendMagicLink(
  email: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.PUBLIC_ORIGIN}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  return {};
}
