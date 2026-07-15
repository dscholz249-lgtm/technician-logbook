"use server";

import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies, createUrgentRequest } from "@/lib/supabase/db";
import { notifySlack, urgentRequestBlocks } from "@/lib/slack";

export async function submitUrgentRequest(
  message: string,
): Promise<{ error?: string }> {
  if (!message.trim()) return { error: "Message is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated." };

  const manager = await getManagerByEmail(user.email).catch(() => null);
  if (!manager) return { error: "Manager not found." };

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager.company_id);
  if (!company) return { error: "Company not found." };

  try {
    await createUrgentRequest({
      company_id: company.id,
      manager_id: manager.id,
      manager_name: manager.name,
      manager_email: manager.email,
      company_name: company.name,
      message: message.trim(),
    });

    await notifySlack(urgentRequestBlocks({
      managerName: manager.name,
      companyName: company.name,
      message: message.trim(),
    }));

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
