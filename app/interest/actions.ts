"use server";

import { createInterestRequest } from "@/lib/supabase/db";
import { notifySlack, interestRequestBlocks } from "@/lib/slack";

export async function submitInterestRequest(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const companyName = (formData.get("company_name") as string)?.trim() || undefined;
  const teamSize = (formData.get("team_size") as string)?.trim() || undefined;

  if (!name || !email) return { error: "Name and email are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    await createInterestRequest({ name, email, company_name: companyName, team_size: teamSize });
    await notifySlack(
      interestRequestBlocks({ name, email, companyName: companyName ?? null, teamSize: teamSize ?? null }),
    );
    return { success: true };
  } catch (err) {
    console.error("[interest] submission failed", err);
    return { error: "Something went wrong. Please try again." };
  }
}
