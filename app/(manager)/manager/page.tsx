import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { getQueue, getLogbook } from "@/lib/api";
import { LogbookTable } from "@/app/(dashboard)/dashboard/logbook-table";
import { PhoneForm } from "./phone-form";
import { ReminderForm } from "./reminder-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import type { QueueItem, } from "@/lib/types";
import type { Technician } from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

const SKILLCAT_SMS_NUMBER = "(251) 313-5407";

function formatTime(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

function TypeBadge({ type }: { type: string }) {
  if (type === "assign_training") {
    return (
      <Badge className="bg-skillcat-blue/20 text-skillcat-blue border-skillcat-blue/30 border">
        Training
      </Badge>
    );
  }
  return (
    <Badge className="bg-skillcat-green/20 text-skillcat-green border-skillcat-green/30 border">
      Add employee
    </Badge>
  );
}

function parsePayload(raw: string): Record<string, unknown> | null {
  try { return JSON.parse(raw); } catch { return null; }
}

function PayloadSummary({ type, raw }: { type: string; raw: string }) {
  const p = parsePayload(raw);
  if (!p) return <span className="text-muted-foreground text-xs">(unparseable)</span>;

  if (type === "assign_training") {
    return (
      <span className="text-xs">
        Assign <span className="font-medium">{String(p.employee_name ?? "—")}</span>{" "}
        → <span className="font-medium">{String(p.certification_name ?? "—")}</span>
      </span>
    );
  }
  if (type === "add_employee") {
    const emp = p.new_employee as Record<string, string> | null;
    return (
      <span className="text-xs">
        Add <span className="font-medium">{emp?.name ?? "—"}</span>{" "}
        ({emp?.title}) · {emp?.email}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{type}</span>;
}

function ReadOnlyQueueTable({ items, showActioned }: { items: QueueItem[]; showActioned?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        {showActioned ? "No actioned items yet." : "No pending actions."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Type</TableHead>
            <TableHead>Request</TableHead>
            <TableHead>Received</TableHead>
            {showActioned && <TableHead>Actioned by</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell><TypeBadge type={item.type} /></TableCell>
              <TableCell className="max-w-xs whitespace-normal">
                <PayloadSummary type={item.type} raw={item.payload} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatTime(item.created_at)}
              </TableCell>
              {showActioned && (
                <TableCell className="text-xs text-muted-foreground">
                  {item.actioned_by ?? "—"}
                  {item.actioned_note && (
                    <span className="block text-muted-foreground/70">{item.actioned_note}</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TechnicianTable({ technicians }: { technicians: Technician[] }) {
  if (technicians.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        No technicians on file. Contact your SkillCat administrator.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {technicians.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium text-sm">{t.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{t.title ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{t.email ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

  const [pending, actioned, logbook] = await Promise.all([
    getQueue("pending", manager.company_id).catch(() => []),
    getQueue("actioned", manager.company_id).catch(() => []),
    getLogbook(manager.company_id).catch(() => []),
  ]);

  const technicians = company?.technicians ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{company?.name ?? "Your Company"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {manager.name} · Read-only view of your team's activity.
        </p>
      </div>

      {/* SMS info callout */}
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

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Pending actions</p>
          <p className={`text-2xl font-semibold mt-0.5 ${pending.length > 0 ? "text-skillcat-orange" : ""}`}>
            {pending.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Technicians</p>
          <p className="text-2xl font-semibold mt-0.5">{technicians.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Logbook entries</p>
          <p className="text-2xl font-semibold mt-0.5">{logbook.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Action Queue
            {pending.length > 0 && (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-skillcat-orange text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="actioned">Actioned</TabsTrigger>
          <TabsTrigger value="logbook">Logbook</TabsTrigger>
          <TabsTrigger value="team">
            Your Team
            {technicians.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">({technicians.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <ReadOnlyQueueTable items={pending} />
        </TabsContent>

        <TabsContent value="actioned" className="mt-4">
          <ReadOnlyQueueTable items={actioned} showActioned />
        </TabsContent>

        <TabsContent value="logbook" className="mt-4">
          <LogbookTable entries={logbook} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TechnicianTable technicians={technicians} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
