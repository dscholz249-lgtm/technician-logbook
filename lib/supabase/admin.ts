import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

// Service-role client for server-side admin operations (bypasses RLS).
export function createAdminClient() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  return createClient(env.SUPABASE_URL, key);
}
