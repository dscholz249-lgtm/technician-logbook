import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { getQueue, getLogbook } from "@/lib/api";
import { PhoneForm } from "./phone-form";
import { ReminderForm } from "./reminder-form";
import { TechLog } from "./tech-log";
import { DirectorAddManager } from "./director-add-manager";
import { ContactCardSection } from "./contact-card-section";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import type { QueueItem, LogbookEntry } from "@/lib/types";
import type { Technician } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

const SKILLCAT_SMS_NUMBER = process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407";

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
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-sm">
                    <Link href={`/manager/technician/${t.id}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.title ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.email ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/manager/technician/${t.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View Logs →
                    </Link>
                  </TableCell>
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

  const isDirector = manager.role === "director";

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager.company_id);

  // Directors see all company activity; managers see only their own.
  const phoneFilter = isDirector ? undefined : (manager.phone ?? undefined);

  const [queue, logbook] = await Promise.all([
    getQueue(undefined, manager.company_id, phoneFilter).catch(() => [] as QueueItem[]),
    getLogbook(manager.company_id, phoneFilter).catch(() => [] as LogbookEntry[]),
  ]);

  const techGroups = buildTechGroups(queue, logbook);
  const technicians = company?.technicians ?? [];
  const totalLogs = queue.length + logbook.length;

  return (
    <div className="space-y-6">
      {/* Company + manager info */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{company?.name ?? "Your Company"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {manager.name}
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded capitalize">{manager.role}</span>
            · Read-only view
          </p>
        </div>
        {isDirector && <DirectorAddManager />}
      </div>

      {/* SMS features + settings */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Left: how it works */}
        <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-4">
          <div>
            <p className="text-sm font-semibold">Send updates by text</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Text <span className="font-mono font-medium text-foreground">{SKILLCAT_SMS_NUMBER}</span>
            </p>
          </div>
          <div className="space-y-3">
            {[
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
            ].map(f => (
              <div key={f.n} className="flex gap-3">
                <span className="text-xs font-bold text-skillcat-orange mt-0.5 shrink-0 w-5">{f.n}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
          {process.env.SKILLCAT_SMS_PHONE && <ContactCardSection />}
        </div>

        {/* Right: phone + reminders */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <PhoneForm currentPhone={manager.phone} />
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <ReminderForm current={manager.reminder_preference ?? "never"} />
          </div>
        </div>
      </div>

      {/* Today's logs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold">
            {isDirector ? "Company Logs" : "My Logs"}
          </h2>
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
