import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { getQueue, getLogbook } from "@/lib/api";
import { TechLog } from "../tech-log";
import { TechInviteButton, InviteAllTechsButton } from "@/components/tech-invite-button";
import { DirectorAddManager } from "../director-add-manager";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { QueueItem, LogbookEntry } from "@/lib/types";
import type { Technician } from "@/lib/supabase/db";
import type { ImpersonateCookie } from "@/app/(dashboard)/dashboard/managers/impersonate-actions";

export const dynamic = "force-dynamic";

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
    if (!e.employee_name_raw) continue; // skip manager self-entries
    const name = e.employee_name_raw;
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

function TechnicianTable({ technicians, companyId }: { technicians: Technician[]; companyId: string }) {
  const eligibleCount = technicians.filter(t => !!t.email).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">
          All Technicians
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {technicians.length} in company
          </span>
        </h2>
        <InviteAllTechsButton companyId={companyId} eligibleCount={eligibleCount} />
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
                    <div className="flex items-center justify-end gap-2">
                      {t.email && <TechInviteButton technicianId={t.id} technicianName={t.name} />}
                      <Link
                        href={`/manager/technician/${t.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View Logs →
                      </Link>
                    </div>
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

export default async function TechniciansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAdmin = env.ADMIN_EMAILS.includes((user?.email ?? "").toLowerCase());
  const jar = await cookies();
  const impersonateCookie = jar.get("skillcat_impersonate");
  let effectiveEmail = user!.email!;
  if (isAdmin && impersonateCookie?.value) {
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

  const phoneFilter = isDirector ? undefined : (manager.phone ?? undefined);

  const [queue, logbook] = await Promise.all([
    getQueue(undefined, manager.company_id, phoneFilter).catch(() => [] as QueueItem[]),
    getLogbook(manager.company_id, phoneFilter).catch(() => [] as LogbookEntry[]),
  ]);

  const techGroups = buildTechGroups(queue, logbook);
  const technicians = company?.technicians ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {company?.name ?? "Your Company"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Technicians</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {technicians.length} in company
          </p>
        </div>
        {isDirector && <DirectorAddManager />}
      </div>

      <TechnicianTable technicians={technicians} companyId={manager.company_id} />

      <TechLog
        groups={techGroups}
        label={isDirector ? "Company Logs" : "Logs about technicians"}
      />

      <AutoRefresh intervalMs={20000} />
    </div>
  );
}
