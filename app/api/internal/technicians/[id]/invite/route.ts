import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessInternal } from "@/lib/internal-auth";
import { getCompanyById, getManagerByPhone, getTechnicianById } from "@/lib/supabase/db";
import { deliverTechInvite } from "@/lib/email/send-tech-invite";

// PRD-438: the manager answered "yes" to "send an invite?" over SMS. Scoped to
// the texting manager's company, so a technician id alone can't trigger an
// invite elsewhere.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const rejected = rejectUnlessInternal(req);
  if (rejected) return rejected;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { manager_phone?: string } | null;
  if (!body?.manager_phone) {
    return NextResponse.json({ error: "manager_phone required" }, { status: 400 });
  }

  try {
    const [manager, technician] = await Promise.all([
      getManagerByPhone(body.manager_phone),
      getTechnicianById(id),
    ]);
    if (!manager || !technician || technician.company_id !== manager.company_id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const company = await getCompanyById(manager.company_id);

    const result = await deliverTechInvite({
      technician,
      companyId: manager.company_id,
      companyName: company?.name ?? "Your company",
      managerName: manager.name,
      sentBy: manager.email ?? manager.phone ?? "sms",
      source: "sms",
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[internal/technicians/invite] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
