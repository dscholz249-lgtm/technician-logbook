import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildOptOutEmail } from "@/lib/email/opt-out";

const SYNC_SECRET = process.env.SYNC_SECRET;
const SKILLCAT_SMS_NUMBER = (process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407").replace(/^["']|["']$/g, "");

export async function POST(req: NextRequest) {
  if (SYNC_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${SYNC_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const { email, employeeName, phone } = await req.json();
  if (!email || !phone) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  const html = buildOptOutEmail({
    employeeName: employeeName ?? "there",
    phone,
    smsNumber: SKILLCAT_SMS_NUMBER,
  });

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: "SkillCat Labs <logbook@tryskillcat.com>",
    to: email,
    subject: "You've opted out of SkillCat texts",
    html,
  });

  if (error) {
    console.error("[opt-out-email]", error);
    return NextResponse.json({ error: "email send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
