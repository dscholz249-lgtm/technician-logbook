"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanies } from "@/lib/supabase/db";
import { env } from "@/lib/env";
import { buildInviteEmail } from "@/lib/email/invite";
import { capture } from "@/lib/analytics";

export async function sendManagerInvite(
  managerId: string,
): Promise<{ error?: string; sent?: boolean }> {
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) return { error: "RESEND_API_KEY is not configured." };

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.managers.some(m => m.id === managerId));
  const manager = company?.managers.find(m => m.id === managerId);

  if (!manager || !company) return { error: "Manager not found." };
  if (!manager.email) return { error: "Manager has no email address on file." };

  const adminClient = createAdminClient();

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: manager.email,
    options: { redirectTo: `${env.PUBLIC_ORIGIN}/auth/confirm` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { error: linkError?.message ?? "Failed to generate login link." };
  }

  const firstName = manager.name.split(/\s+/)[0];
  const html = buildInviteEmail({
    firstName,
    companyName: company.name,
    loginLink: linkData.properties.action_link,
    preferencesLink: `${env.PUBLIC_ORIGIN}/manager`,
    origin: env.PUBLIC_ORIGIN,
  });

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: "SkillCat Labs <logbook@tryskillcat.com>",
    to: manager.email,
    subject: `Welcome to SkillCat Labs, ${firstName}`,
    html,
  });

  if (sendError) return { error: sendError.message };

  await capture(manager.email, "invite_sent", { company_id: company.id, company_name: company.name });

  revalidatePath("/dashboard/managers");
  return { sent: true };
}
