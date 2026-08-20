"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanies, getManagerByEmail } from "@/lib/supabase/db";
import { env, isAdmin } from "@/lib/env";
import { buildTechInviteEmail } from "@/lib/email/tech-invite";
import { capture } from "@/lib/analytics";

const SKILLCAT_SMS_NUMBER = (process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407").replace(/^["']|["']$/g, "");

async function getCallerInfo(): Promise<{ email: string; name: string; isAdmin: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const userIsAdmin = isAdmin(user.email);
  if (userIsAdmin) {
    return { email: user.email, name: "SkillCat", isAdmin: true };
  }

  const manager = await getManagerByEmail(user.email);
  if (!manager) throw new Error("Not authorized");
  return { email: user.email, name: manager.name, isAdmin: false };
}

export async function getTechInviteEmailPreview(
  technicianId: string,
): Promise<{ error?: string; html?: string; firstName?: string; email?: string }> {
  const caller = await getCallerInfo().catch(e => { throw e; });
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) return { error: "RESEND_API_KEY is not configured." };

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.technicians.some(t => t.id === technicianId));
  const technician = company?.technicians.find(t => t.id === technicianId);

  if (!technician || !company) return { error: "Technician not found." };
  if (!technician.email) return { error: "Technician has no email address on file." };

  // Non-admins can only invite technicians in their own company
  if (!caller.isAdmin) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const manager = await getManagerByEmail(user!.email!);
    if (manager?.company_id !== company.id) return { error: "Not authorized to invite technicians at this company." };
  }

  const firstName = technician.name.split(/\s+/)[0];
  const html = buildTechInviteEmail({
    firstName,
    companyName: company.name,
    managerName: caller.name,
    loginLink: "#preview",
    preferencesLink: `${env.PUBLIC_ORIGIN}/tech`,
    smsNumber: SKILLCAT_SMS_NUMBER,
  });

  return { html, firstName, email: technician.email };
}

export async function sendTechnicianInvite(
  technicianId: string,
): Promise<{ error?: string; sent?: boolean }> {
  const caller = await getCallerInfo().catch(e => ({ error: (e as Error).message }));
  if ("error" in caller) return caller as { error: string };

  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) return { error: "RESEND_API_KEY is not configured." };

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.technicians.some(t => t.id === technicianId));
  const technician = company?.technicians.find(t => t.id === technicianId);

  if (!technician || !company) return { error: "Technician not found." };
  if (!technician.email) return { error: "Technician has no email address on file." };

  // Non-admins can only invite technicians in their own company
  if (!caller.isAdmin) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const manager = await getManagerByEmail(user!.email!);
    if (manager?.company_id !== company.id) return { error: "Not authorized to invite technicians at this company." };
  }

  const adminClient = createAdminClient();
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: technician.email,
    options: { redirectTo: `${env.PUBLIC_ORIGIN}/auth/confirm` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { error: linkError?.message ?? "Failed to generate login link." };
  }

  const firstName = technician.name.split(/\s+/)[0];
  const html = buildTechInviteEmail({
    firstName,
    companyName: company.name,
    managerName: caller.name,
    loginLink: linkData.properties.action_link,
    preferencesLink: `${env.PUBLIC_ORIGIN}/tech`,
    smsNumber: SKILLCAT_SMS_NUMBER,
  });

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: "SkillCat Labs <logbook@tryskillcat.com>",
    to: technician.email,
    subject: `${company.name} has added you to SkillCat Labs`,
    html,
  });

  if (sendError) return { error: sendError.message };

  await capture(technician.email, "tech_invite_sent", {
    company_id: company.id,
    company_name: company.name,
    sent_by: caller.email,
  });

  return { sent: true };
}

export async function sendAllTechnicianInvites(
  companyId: string,
): Promise<{ error?: string; sent: number; failed: number }> {
  const caller = await getCallerInfo().catch(e => ({ error: (e as Error).message }));
  if ("error" in caller) return { ...(caller as { error: string }), sent: 0, failed: 0 };

  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) return { error: "RESEND_API_KEY is not configured.", sent: 0, failed: 0 };

  if (!caller.isAdmin) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const manager = await getManagerByEmail(user!.email!);
    if (manager?.company_id !== companyId) {
      return { error: "Not authorized to invite technicians at this company.", sent: 0, failed: 0 };
    }
  }

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === companyId);
  if (!company) return { error: "Company not found.", sent: 0, failed: 0 };

  const eligible = company.technicians.filter(t => !!t.email);
  if (eligible.length === 0) return { sent: 0, failed: 0 };

  const adminClient = createAdminClient();
  const resend = new Resend(resendKey);
  let sent = 0;
  let failed = 0;

  for (const technician of eligible) {
    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: technician.email!,
        options: { redirectTo: `${env.PUBLIC_ORIGIN}/auth/confirm` },
      });

      if (linkError || !linkData?.properties?.action_link) { failed++; continue; }

      const firstName = technician.name.split(/\s+/)[0];
      const html = buildTechInviteEmail({
        firstName,
        companyName: company.name,
        managerName: caller.name,
        loginLink: linkData.properties.action_link,
        preferencesLink: `${env.PUBLIC_ORIGIN}/tech`,
        smsNumber: SKILLCAT_SMS_NUMBER,
      });

      const { error: sendError } = await resend.emails.send({
        from: "SkillCat Labs <logbook@tryskillcat.com>",
        to: technician.email!,
        subject: `${company.name} has added you to SkillCat Labs`,
        html,
      });

      if (sendError) { failed++; continue; }

      await capture(technician.email!, "tech_invite_sent", {
        company_id: company.id,
        company_name: company.name,
        sent_by: caller.email,
        batch: true,
      });

      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
