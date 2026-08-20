import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { PhoneForm } from "../phone-form";
import { ReminderForm } from "../reminder-form";
import { DirectorAddManager } from "../director-add-manager";
import { cookies } from "next/headers";
import { env, isAdmin } from "@/lib/env";
import type { ImpersonateCookie } from "@/app/(dashboard)/dashboard/managers/impersonate-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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

  const isDirector = manager.role === "director";
  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager.company_id);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {company?.name ?? "Your Company"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Your contact details and reminders</p>
        </div>
        {isDirector && <DirectorAddManager />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <PhoneForm currentPhone={manager.phone} />
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <ReminderForm current={manager.reminder_preference ?? "never"} />
        </div>
      </div>
    </div>
  );
}
