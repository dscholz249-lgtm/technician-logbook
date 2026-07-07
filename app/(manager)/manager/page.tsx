import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { getQueue, getLogbook } from "@/lib/api";
import { PhoneForm } from "./phone-form";
import { ReminderForm } from "./reminder-form";
import { TechLog } from "./tech-log";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import type { QueueItem, LogbookEntry } from "@/lib/types";
import type { Technician } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

const SKILLCAT_SMS_NUMBER = "(251) 313-5407";

export type LogItem =
  | { kind: "assignment"; data: QueueItem; techName: string }
  | { kind: "note"; data: LogbookEntry; techName: string };

function parsePayload(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function buildTechGroups(queue: QueueItem[], logbook: LogbookEntry[]) {
  const groups = new Map<string, LogItem[]>();

  function add(name: string, item: LogItem) {
    const key = name.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  for (const q of queue) {
    const p = parsePayload(q.payload);
    const name = q.type === "assign_training"
      ? String(p.employee_name ?? "Unknown")
      : q.type === "add_employee"
        ? String(p.name ?? "Unknown")
        : "Unknown";
    add(name, { kind: "assignment", data: q, techName: name });
  }

  for (const e of logbook) {
    const name = e.employee_name_raw || "Unknown";
    add(name, { kind: "note", data: e, techName: name });
  }

  return Array.from(groups.entries())
    .map(([, items]) => ({
      name: items[0].techName,
      items: items.sort((a, b) => b.data.created_at - a.data.created_at),
      assignmentCount: items.filter(i => i.kind === "assignment").length,
      noteCount: items.filter(i => i.kind === "note").length,
    }))
    .sort((a, b) => b.items[0].data.created_at - a.items[0].data.created_at);
}

function TechnicianTable({ technicians }: { technicians: Technician[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">
          All Technicians
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {technicians.length} in company
          </span>
        </h2>
      </div>
      {technicians.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">
          No technicians on file. Contact your SkillCat administrator.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Technician</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-sm">
                    <Link href={`/manager/technician/${t.id}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.title ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.email ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default async function ManagerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const manager = await getManagerByEmail(user!.email!);
  if (!manager) return null;

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager.company_id);

  const [queue, logbook] = await Promise.all([
    getQueue(undefined, manager.company_id).catch(() => [] as QueueItem[]),
    getLogbook(manager.company_id).catch(() => [] as LogbookEntry[]),
  ]);

  const techGroups = buildTechGroups(queue, logbook);
  const technicians = company?.technicians ?? [];
  const totalLogs = queue.length + logbook.length;

  return (
    <div className="space-y-6">
        {/* Company + manager info */}
        <div>
          <h1 className="text-xl font-semibold">{company?.name ?? "Your Company"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{manager.name} · Read-only view</p>
        </div>

        {/* SMS callout */}
        <div className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-start gap-3">
          <div className="mt-0.5 size-7 rounded-md bg-skillcat-orange/15 flex items-center justify-center shrink-0 text-skillcat-orange text-base">
            💬
          </div>
          <div>
            <p className="text-sm font-medium">Send updates by text</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Text <span className="font-mono font-medium text-foreground">{SKILLCAT_SMS_NUMBER}</span> to
              add a note about a technician or assign them to a new training.
            </p>
          </div>
        </div>

        {/* Settings row */}
        <div className="flex flex-wrap gap-4">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <PhoneForm currentPhone={manager.phone} />
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <ReminderForm current={manager.reminder_preference ?? "never"} />
          </div>
        </div>

        {/* Today's logs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">Today's Logs</h2>
            <span className="text-xs text-muted-foreground">
              {totalLogs} {totalLogs === 1 ? "entry" : "entries"} · {techGroups.length} {techGroups.length === 1 ? "technician" : "technicians"}
            </span>
          </div>
          <TechLog groups={techGroups} />
        </div>

        {/* All technicians */}
        <TechnicianTable technicians={technicians} />
        <AutoRefresh intervalMs={20000} />
    </div>
  );
}
