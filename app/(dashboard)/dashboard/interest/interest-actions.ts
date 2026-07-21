"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateInterestRequestStatus } from "@/lib/supabase/db";
import { env } from "@/lib/env";
import type { InterestRequest } from "@/lib/supabase/db";

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !env.ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
}

export async function setInterestStatus(
  id: string,
  status: InterestRequest["status"],
): Promise<void> {
  await requireAdmin();
  await updateInterestRequestStatus(id, status);
  revalidatePath("/dashboard/interest");
}
