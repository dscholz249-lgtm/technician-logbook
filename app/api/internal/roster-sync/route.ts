import { NextRequest, NextResponse } from "next/server";
import { getCompanies } from "@/lib/supabase/db";
import { syncCompanyToExpress } from "@/lib/sync";

// Called by the Express SMS server on startup to re-seed its SQLite employee
// snapshot after a Railway restart wipes the ephemeral container filesystem.
// Also callable from the admin "Sync roster" button via syncAllCompanies().
export async function POST(req: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const companies = await getCompanies();
    await Promise.all(
      companies.map(c =>
        syncCompanyToExpress(c.id, c.managers, c.technicians).catch(e => {
          console.error(`[roster-sync] company ${c.id} failed:`, e.message);
        }),
      ),
    );
    return NextResponse.json({ ok: true, synced: companies.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[roster-sync] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
