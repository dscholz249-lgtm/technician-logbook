import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessInternal } from "@/lib/internal-auth";
import { addTechnician, findContactConflict, getCompanies, getManagerByPhone } from "@/lib/supabase/db";
import { syncCompanyToExpress } from "@/lib/sync";

// PRD-438: a manager/director adds a technician by text. Called by the Express
// SMS server once the conversation has a name (and, optionally, an email). The
// company comes from the texting manager's phone, never from the request body.
//
// 200 { technician_id }            created
// 409 { code: "email_taken" }      email already belongs to someone
// 404 { code: "manager_not_found" } phone isn't an active manager
export async function POST(req: NextRequest) {
  const rejected = rejectUnlessInternal(req);
  if (rejected) return rejected;

  const body = (await req.json().catch(() => null)) as
    | { manager_phone?: string; name?: string; email?: string | null }
    | null;
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase() || null;
  if (!body?.manager_phone || !name) {
    return NextResponse.json({ error: "manager_phone and name required" }, { status: 400 });
  }

  try {
    const manager = await getManagerByPhone(body.manager_phone);
    if (!manager) {
      return NextResponse.json({ code: "manager_not_found" }, { status: 404 });
    }
    if (email && (await findContactConflict({ email, phone: null }))) {
      return NextResponse.json({ code: "email_taken" }, { status: 409 });
    }

    const technician = await addTechnician(manager.company_id, { name, email });

    const company = (await getCompanies()).find(c => c.id === manager.company_id);
    if (company) {
      await syncCompanyToExpress(company.id, company.name, company.managers, company.technicians);
    }
    return NextResponse.json({ technician_id: technician.id, company_name: company?.name ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[internal/technicians] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
