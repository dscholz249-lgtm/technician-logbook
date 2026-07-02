import { getQueue, getLogbook } from "@/lib/api";
import { getCompanies } from "@/lib/supabase/db";
import { RequestList } from "./request-list";
import type { QueueItem, LogbookEntry } from "@/lib/types";
import type { CompanyWithRelations, Manager } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}

export type UnifiedItem =
  | { kind: "action"; data: QueueItem }
  | { kind: "note"; data: LogbookEntry };

export interface ManagerGroup {
  phone: string;
  name: string;
  pendingCount: number;
  items: UnifiedItem[];
}

export interface CompanyGroup {
  id: string;
  name: string;
  pendingCount: number;
  managers: ManagerGroup[];
}

function buildGroups(
  queue: QueueItem[],
  logbook: LogbookEntry[],
  companies: CompanyWithRelations[],
): CompanyGroup[] {
  const companyMap = new Map(companies.map(c => [c.id, c]));

  const phoneToManager = new Map<string, Manager>();
  for (const c of companies) {
    for (const m of c.managers) {
      if (m.phone) phoneToManager.set(normalizePhone(m.phone), m);
    }
  }

  // company_id → manager_phone → items
  const tree = new Map<string, Map<string, UnifiedItem[]>>();

  function add(companyId: string | null, phone: string, item: UnifiedItem) {
    const cid = companyId ?? "unknown";
    if (!tree.has(cid)) tree.set(cid, new Map());
    const mg = tree.get(cid)!;
    if (!mg.has(phone)) mg.set(phone, []);
    mg.get(phone)!.push(item);
  }

  for (const item of queue) add(item.company_id, item.manager_phone, { kind: "action", data: item });
  for (const entry of logbook) add(entry.company_id, entry.manager_phone, { kind: "note", data: entry });

  const result: CompanyGroup[] = [];

  for (const [cid, managerMap] of tree) {
    const company = companyMap.get(cid);
    const managers: ManagerGroup[] = [];

    for (const [phone, items] of managerMap) {
      const manager = phoneToManager.get(normalizePhone(phone));
      const sorted = [...items].sort((a, b) => {
        const ta = a.kind === "action" ? a.data.created_at : a.data.created_at;
        const tb = b.kind === "action" ? b.data.created_at : b.data.created_at;
        return tb - ta; // newest first
      });
      const pendingCount = items.filter(i => i.kind === "action" && i.data.status === "pending").length;
      managers.push({ phone, name: manager?.name ?? phone, pendingCount, items: sorted });
    }

    const pendingCount = managers.reduce((s, m) => s + m.pendingCount, 0);
    result.push({ id: cid, name: company?.name ?? "Unknown Company", pendingCount, managers });
  }

  return result.sort((a, b) => b.pendingCount - a.pendingCount);
}

function avgResponseHours(queue: QueueItem[]): string {
  const actioned = queue.filter(q => q.actioned_at && q.created_at);
  if (actioned.length === 0) return "—";
  const avg = actioned.reduce((s, q) => s + (q.actioned_at! - q.created_at), 0) / actioned.length;
  const hrs = avg / 1000 / 60 / 60;
  return hrs < 1 ? `${Math.round(avg / 1000 / 60)} min` : `${hrs.toFixed(1)} hrs`;
}

function isToday(ts: number) {
  const d = new Date(ts);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default async function DashboardPage() {
  const [queue, logbook, companies] = await Promise.all([
    getQueue().catch(() => [] as QueueItem[]),
    getLogbook().catch(() => [] as LogbookEntry[]),
    getCompanies().catch(() => [] as CompanyWithRelations[]),
  ]);

  const groups = buildGroups(queue, logbook, companies);
  const pending = queue.filter(q => q.status === "pending");
  const actionedToday = queue.filter(q => q.status === "actioned" && q.actioned_at && isToday(q.actioned_at));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Incoming Requests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Field manager SMS routed for review · {companies.length} {companies.length === 1 ? "company" : "companies"} live
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pending Requests", value: pending.length, highlight: pending.length > 0 },
          { label: "Actioned Today", value: actionedToday.length },
          { label: "Avg Response Time", value: avgResponseHours(queue) },
          { label: "Companies Live", value: companies.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${s.highlight ? "text-skillcat-orange" : ""}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-skillcat-orange" /> Assignment — needs action
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/40" /> Note — informational
        </span>
      </div>

      <RequestList groups={groups} />
    </div>
  );
}
