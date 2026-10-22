import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { buildTechInviteEmail } from "@/lib/email/tech-invite";
import { capture } from "@/lib/analytics";
import type { Technician } from "@/lib/supabase/db";

export const SKILLCAT_SMS_NUMBER = (process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407").replace(/^["']|["']$/g, "");

/**
 * Generate a magic sign-in link and email one technician their invite. Callers
 * do their own authorization — the dashboard's "Send invite" button and the
 * SMS add-technician flow (PRD-438) both land here.
 */
export async function deliverTechInvite(opts: {
  technician: Pick<Technician, "name" | "email">;
  companyId: string;
  companyName: string;
  managerName: string;
  sentBy: string;
  source?: string;
}): Promise<{ error?: string; sent?: boolean }> {
  const { technician, companyId, companyName, managerName, sentBy, source } = opts;
  if (!technician.email) return { error: "Technician has no email address on file." };

  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) return { error: "RESEND_API_KEY is not configured." };

  const { data: linkData, error: linkError } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: technician.email,
    options: { redirectTo: `${env.PUBLIC_ORIGIN}/auth/confirm` },
  });
  if (linkError || !linkData?.properties?.action_link) {
    return { error: linkError?.message ?? "Failed to generate login link." };
  }

  const html = buildTechInviteEmail({
    firstName: technician.name.split(/\s+/)[0],
    companyName,
    managerName,
    loginLink: linkData.properties.action_link,
    preferencesLink: `${env.PUBLIC_ORIGIN}/tech`,
    smsNumber: SKILLCAT_SMS_NUMBER,
  });

  const { error: sendError } = await new Resend(resendKey).emails.send({
    from: "SkillCat Labs <logbook@tryskillcat.com>",
    to: technician.email,
    subject: `${companyName} has added you to SkillCat Labs`,
    html,
  });
  if (sendError) return { error: sendError.message };

  await capture(technician.email, "tech_invite_sent", {
    company_id: companyId,
    company_name: companyName,
    sent_by: sentBy,
    ...(source ? { source } : {}),
  });
  return { sent: true };
}
