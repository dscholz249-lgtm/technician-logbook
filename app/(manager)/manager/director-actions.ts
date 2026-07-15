"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, upsertManager } from "@/lib/supabase/db";

async function requireDirector(): Promise<{ managerId: string; companyId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated.");

  const manager = await getManagerByEmail(user.email);
  if (!manager || manager.role !== "director") throw new Error("Director access required.");

  return { managerId: manager.id, companyId: manager.company_id };
}

export async function addManagerAsDirector(
  formData: FormData,
): Promise<{ error?: string }> {
  let companyId: string;
  try {
    ({ companyId } = await requireDirector());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unauthorized." };
  }

  const name = (formData.get("manager_name") as string)?.trim();
  const email = (formData.get("manager_email") as string)?.trim().toLowerCase();
  const phone = (formData.get("manager_phone") as string)?.trim() || null;

  if (!name || !email) return { error: "Name and email are required." };

  try {
    await upsertManager(companyId, { name, email, phone, role: "manager" });
    revalidatePath("/manager");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
