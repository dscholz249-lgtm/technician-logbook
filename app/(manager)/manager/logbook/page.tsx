import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { getManagerOwnLogbook } from "@/lib/api";
import { LogbookGrid } from "../logbook-card";
import { MessageSquareIcon } from "lucide-react";
import { cookies } from "next/headers";
import { env, isAdmin } from "@/lib/env";
import type { ImpersonateCookie } from "@/app/(dashboard)/dashboard/managers/impersonate-actions";

export const dynamic = "force-dynamic";

const SKILLCAT_SMS_NUMBER = (process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407").replace(/^["']|["']$/g, "");

export default async function ManagerLogbookPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userIsAdmin = isAdmin(user?.email ?? "");
  const jar = await cookies();
  const impersonateCookie = jar.get("skillcat_impersonate");
  let effectiveEmail = user!.email!;
  if (userIsAdmin && impersonateCookie?.value) {
    try {
      const imp = JSON.parse(impersonateCookie.value) as ImpersonateCookie;
      effectiveEmail = imp.email;
    } catch {}
  }

  const manager = await getManagerByEmail(effectiveEmail);
  if (!manager) return null;

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager.company_id);

  const entries = manager.phone
    ? await getManagerOwnLogbook(manager.company_id, manager.phone).catch(() => [])
    : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {company?.name ?? "Your Company"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">My Logbook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Notes and photos you&apos;ve sent in from the field
        </p>
      </div>

      {/* Composer callout */}
      <div className="rounded-xl border border-dashed border-border bg-card px-5 py-4 flex items-center gap-4">
        <div className="size-10 rounded-xl bg-skillcat-orange/10 flex items-center justify-center shrink-0">
          <MessageSquareIcon className="size-5 text-skillcat-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Add to your logbook</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Text a photo or note to{" "}
            <span className="font-mono text-foreground">{SKILLCAT_SMS_NUMBER}</span>.
            Capture time is recorded automatically.
          </p>
        </div>
        <Link href="/manager/how-to" className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          How it works →
        </Link>
      </div>

      <LogbookGrid entries={entries} />

      <AutoRefresh intervalMs={30000} />
    </div>
  );
}
