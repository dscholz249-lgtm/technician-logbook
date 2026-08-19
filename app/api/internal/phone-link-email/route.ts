import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildPhoneLinkEmail } from "@/lib/email/phone-link-confirm";

const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(req: NextRequest) {
  if (SYNC_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${SYNC_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const { token, email, employeeName, phone, nextjsUrl } = await req.json();
  if (!token || !email || !phone || !nextjsUrl) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  const confirmUrl = `${nextjsUrl}/link-phone?token=${token}&action=confirm`;
  const denyUrl = `${nextjsUrl}/link-phone?token=${token}&action=deny`;

  const html = buildPhoneLinkEmail({ employeeName: employeeName ?? "there", phone, email, confirmUrl, denyUrl });

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: "SkillCat Labs <logbook@tryskillcat.com>",
    to: email,
    subject: "Confirm your phone number — SkillCat Logbook",
    html,
  });

  if (error) {
    console.error("[phone-link-email]", error);
    return NextResponse.json({ error: "email send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
