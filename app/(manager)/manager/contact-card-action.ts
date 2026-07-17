"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { generateVCard } from "@/lib/vcard";

export async function emailContactCard(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated." };

  const vcard = generateVCard();
  if (!vcard) return { error: "Contact card is not configured yet — ask your SkillCat admin." };

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { error: "Email service not configured." };

  const phone = env.SKILLCAT_SMS_PHONE ?? "";

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "SkillCat <noreply@tryskillcat.com>",
      to: user.email,
      subject: "Save SkillCat to your contacts",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
          <h2 style="margin-bottom:4px;">Save SkillCat to your contacts</h2>
          <p style="color:#555;margin-top:0;">Open the attached <strong>.vcf</strong> file to add the SkillCat number directly to your phone's contacts.</p>
          <p style="font-size:18px;font-weight:600;letter-spacing:0.02em;">${phone}</p>
          <p style="color:#555;">Text this number to assign training, log technician notes, and more — no app required.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:12px;">— The SkillCat Team</p>
        </div>
      `,
      attachments: [
        {
          filename: "SkillCat.vcf",
          content: Buffer.from(vcard).toString("base64"),
        },
      ],
    });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send email." };
  }
}
