"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getManagerByEmail, updateManagerPhone, updateManagerReminderPreference,
  type ReminderPreference,
} from "@/lib/supabase/db";

export async function saveReminderPreference(
  preference: ReminderPreference,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated." };

  const manager = await getManagerByEmail(user.email).catch(() => null);
  if (!manager) return { error: "Manager not found." };

  try {
    await updateManagerReminderPreference(manager.id, preference);
    revalidatePath("/manager");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error." };
  }
}

export async function savePhone(formData: FormData): Promise<{ error?: string }> {
  const phone = (formData.get("phone") as string)?.trim();
  if (!phone) return { error: "Phone number is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated." };

  const manager = await getManagerByEmail(user.email).catch(() => null);
  if (!manager) return { error: "Manager not found." };

  try {
    await updateManagerPhone(manager.id, phone);
    revalidatePath("/manager");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error." };
  }
}
