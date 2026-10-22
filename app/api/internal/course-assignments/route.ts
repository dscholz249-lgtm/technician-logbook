import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rejectUnlessInternal } from "@/lib/internal-auth";
import { getCompanyById, getManagerByPhone, getTechnicianById } from "@/lib/supabase/db";
import { buildCourseAssignmentEmail } from "@/lib/email/course-assignment";
import { capture } from "@/lib/analytics";
import { env } from "@/lib/env";

// PRD-436: a manager/director assigned a course by text. The SMS server texts
// the technician itself; this sends the email, since the Logbook app holds the
// technician's email and the Resend key. Scoped to the texting manager's
// company, and the link must be a skillcat.app course page.
//
// 200 { emailed: true|false }   false = technician has no email on file
// 404                            manager/technician not found or not in company
export async function POST(req: NextRequest) {
  const rejected = rejectUnlessInternal(req);
  if (rejected) return rejected;

  const body = (await req.json().catch(() => null)) as
    | { manager_phone?: string; technician_id?: string; course_name?: string; course_link?: string }
    | null;
  const { manager_phone, technician_id, course_name, course_link } = body ?? {};
  if (!manager_phone || !technician_id || !course_name || !course_link) {
    return NextResponse.json({ error: "manager_phone, technician_id, course_name, course_link required" }, { status: 400 });
  }
  let host = "";
  try { host = new URL(course_link).host; } catch {}
  if (host !== "skillcat.app") {
    return NextResponse.json({ error: "course_link must be a skillcat.app URL" }, { status: 400 });
  }

  try {
    const [manager, technician] = await Promise.all([
      getManagerByPhone(manager_phone),
      getTechnicianById(technician_id),
    ]);
    if (!manager || !technician || technician.company_id !== manager.company_id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (!technician.email) return NextResponse.json({ emailed: false });
    if (!env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 503 });
    }

    const company = await getCompanyById(manager.company_id);
    const html = buildCourseAssignmentEmail({
      firstName: technician.name.split(/\s+/)[0],
      managerName: manager.name,
      companyName: company?.name ?? "your company",
      courseName: course_name,
      courseLink: course_link,
    });
    const { error } = await new Resend(env.RESEND_API_KEY).emails.send({
      from: "SkillCat Labs <logbook@tryskillcat.com>",
      to: technician.email,
      subject: `${manager.name} assigned you ${course_name}`,
      html,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });

    await capture(technician.email, "course_assignment_emailed", {
      company_id: manager.company_id,
      course_name,
      sent_by: manager.email ?? manager.phone ?? "sms",
    });
    return NextResponse.json({ emailed: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[internal/course-assignments] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
