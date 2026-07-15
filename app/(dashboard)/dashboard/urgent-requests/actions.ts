"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { resolveUrgentRequest } from "@/lib/supabase/db";

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !env.ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
}

export async function resolveRequest(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
    await resolveUrgentRequest(id);
    revalidatePath("/dashboard/urgent-requests");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
