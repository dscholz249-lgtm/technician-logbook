"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTechnicianByEmail, updateTechnicianPhone } from "@/lib/supabase/db";

export async function saveTechPhone(formData: FormData): Promise<{ error?: string }> {
  const phone = (formData.get("phone") as string)?.trim();
  if (!phone) return { error: "Phone number is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated." };

  const technician = await getTechnicianByEmail(user.email).catch(() => null);
  if (!technician) return { error: "Technician not found." };

  try {
    await updateTechnicianPhone(technician.id, phone);
    revalidatePath("/tech");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error." };
  }
}
