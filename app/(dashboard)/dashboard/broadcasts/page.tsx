import { getCompanies } from "@/lib/supabase/db";
import { getLastActiveByPhones, getBroadcasts, getOptedOutPhones } from "@/lib/api";
import type { BroadcastSummary } from "@/lib/api";
import { BroadcastComposer } from "./broadcast-composer";
import { BroadcastHistory } from "./broadcast-history";

export const dynamic = "force-dynamic";

export interface BroadcastCandidate {
  id: string;
  name: string;
  phone: string | null;
  role: "manager" | "director";
  companyId: string;
  companyName: string;
  reminderPreference: string;
  lastActiveAt: string | null;
  optedOut: boolean;
}

export default async function BroadcastsPage() {
  const companies = await getCompanies().catch(() => []);

  const managers = companies.flatMap(c =>
    c.managers.map(m => ({ manager: m, company: c })),
  );
  const phones = managers
    .map(({ manager }) => manager.phone)
    .filter((p): p is string => Boolean(p));

  const [lastActive, optedOutPhones] = await Promise.all([
    getLastActiveByPhones(phones).catch(() => ({} as Record<string, string>)),
    getOptedOutPhones(phones).catch(() => [] as string[]),
  ]);
  const optedOut = new Set(optedOutPhones);

  const candidates: BroadcastCandidate[] = managers
    .map(({ manager, company }) => ({
      id: manager.id,
      name: manager.name,
      phone: manager.phone,
      role: manager.role,
      companyId: company.id,
      companyName: company.name,
      reminderPreference: manager.reminder_preference,
      lastActiveAt: manager.phone ? lastActive[manager.phone] ?? null : null,
      optedOut: manager.phone ? optedOut.has(manager.phone) : false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const companyOptions = companies
    .map(c => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const history = await getBroadcasts().catch(() => [] as BroadcastSummary[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Broadcast</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Send an SMS to managers and directors across companies. Every message is
          logged to their conversation thread.
        </p>
      </div>

      <BroadcastComposer candidates={candidates} companies={companyOptions} />
      <BroadcastHistory broadcasts={history} />
    </div>
  );
}
