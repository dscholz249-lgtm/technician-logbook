import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { ContactCardSection } from "../contact-card-section";
import { RequestHelpButton } from "../request-help-button";

export const dynamic = "force-dynamic";

const SKILLCAT_SMS_NUMBER = (process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407").replace(/^["']|["']$/g, "");

const STEPS = [
  {
    n: "01",
    title: "Lookup and assign courses",
    body: "Just let us know who you want to assign and which course. Don't know which course? Just ask.",
  },
  {
    n: "02",
    title: "Add new technicians",
    body: "Tell us the new tech's name and email and we'll add them to your roster.",
  },
  {
    n: "03",
    title: "Leave a note",
    body: "Flag anything about a technician and we'll save it to their record in your dashboard.",
  },
  {
    n: "04",
    title: "Log for yourself",
    body: null, // rendered with a link
  },
];

export default async function HowToPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const manager = await getManagerByEmail(user!.email!).catch(() => null);
  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager?.company_id);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {company?.name ?? "Your Company"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">How To</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you can do by text</p>
      </div>

      <div className="rounded-xl border border-border bg-card px-6 py-5 space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Send updates by text</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Text{" "}
              <span className="font-mono text-foreground">{SKILLCAT_SMS_NUMBER}</span>
            </p>
          </div>
          <RequestHelpButton variant="button" />
        </div>

        {/* Steps */}
        <div className="space-y-5">
          {STEPS.map(step => (
            <div key={step.n} className="flex gap-4">
              <span className="text-sm font-bold text-skillcat-orange shrink-0 w-6 pt-0.5">{step.n}</span>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                {step.n === "04" ? (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Send a photo or message about your own work and it lands in{" "}
                    <Link href="/manager/logbook" className="text-skillcat-orange hover:underline">
                      My Logbook
                    </Link>
                    .
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.body}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Divider + contact card */}
        <div className="border-t border-border pt-5 space-y-3">
          <div>
            <p className="text-sm font-semibold">Save to contacts</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add SkillCat to your phone so you always recognise our texts.
            </p>
          </div>
          {process.env.SKILLCAT_SMS_PHONE && <ContactCardSection />}
        </div>
      </div>
    </div>
  );
}
