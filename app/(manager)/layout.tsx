import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { env } from "@/lib/env";
import { ManagerNav } from "@/components/manager-nav";
import { ImpersonationBanner } from "./impersonation-banner";
import { PhoneRequiredModal } from "@/components/phone-required-modal";
import { savePhone } from "./manager/actions";
import type { ImpersonateCookie } from "@/app/(dashboard)/dashboard/managers/impersonate-actions";

const SKILLCAT_SMS_NUMBER = (process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407").replace(/^["']|["']$/g, "");

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect("/auth/sign-in");

  const isAdmin = env.ADMIN_EMAILS.includes(user.email.toLowerCase());
  const jar = await cookies();
  const impersonateCookie = jar.get("skillcat_impersonate");
  let impersonating: ImpersonateCookie | null = null;
  let effectiveEmail = user.email;

  if (isAdmin && impersonateCookie?.value) {
    try {
      impersonating = JSON.parse(impersonateCookie.value) as ImpersonateCookie;
      effectiveEmail = impersonating.email;
    } catch {}
  }

  const manager = await getManagerByEmail(effectiveEmail).catch(() => null);
  if (!manager) redirect("/auth/sign-in?error=not_authorized");

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager.company_id);

  return (
    <div className="min-h-screen flex flex-col">
      {impersonating && (
        <ImpersonationBanner name={impersonating.name} role={impersonating.role} />
      )}
      <div className="flex flex-1 min-h-0">
        <ManagerNav
          companyName={company?.name ?? "Your Company"}
          managerName={manager.name}
          email={effectiveEmail}
        />
        <main className="flex-1 min-w-0 px-6 py-8 md:px-10 max-w-5xl">
          <PhoneRequiredModal
            currentPhone={manager.phone}
            smsNumber={SKILLCAT_SMS_NUMBER}
            action={savePhone}
          />
          {children}
          <footer className="mt-16 pt-5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span />
            <span>
              Need to remove a manager? Contact{" "}
              <a href="mailto:support@tryskillcat.com" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">
                support@tryskillcat.com
              </a>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
