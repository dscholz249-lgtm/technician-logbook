import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getCompanies } from "@/lib/supabase/db";
import { getQueue, getLogbook, getTechnicianMedia } from "@/lib/api";
import { ChevronLeftIcon, MessageSquareIcon } from "lucide-react";
import type { QueueItem, LogbookEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function parsePayload(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function nameMatches(techName: string, candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const t = techName.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();
  if (t === c) return true;
  const tFirst = t.split(/\s+/)[0];
  const cFirst = c.split(/\s+/)[0];
  if (tFirst.length >= 3 && tFirst === cFirst) return true;
  if (t.includes(c) || c.includes(t)) return true;
  return false;
}

type Entry =
  | { kind: "assignment"; data: QueueItem; description: string }
  | { kind: "note"; data: LogbookEntry; description: string };

function formatDate(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

export default async function TechnicianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const manager = await getManagerByEmail(user!.email!);
  if (!manager) return notFound();

  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === manager.company_id);
  if (!company) return notFound();

  const technician = company.technicians.find(t => t.id === id);
  if (!technician) return notFound();

  const [queue, logbook, media] = await Promise.all([
    getQueue(undefined, manager.company_id).catch(() => [] as QueueItem[]),
    getLogbook(manager.company_id).catch(() => [] as LogbookEntry[]),
    getTechnicianMedia(manager.company_id, id).catch(() => []),
  ]);

  const entries: Entry[] = [];

  for (const q of queue) {
    const p = parsePayload(q.payload);
    const employeeName =
      q.type === "assign_training"
        ? String(p.employee_name ?? "")
        : q.type === "add_employee"
          ? String((p.new_employee as Record<string, string> | null)?.name ?? "")
          : "";
    if (!nameMatches(technician.name, employeeName)) continue;

    const description =
      q.type === "assign_training"
        ? `Assign to the ${p.certification_name} training`
        : q.type === "add_employee"
          ? `Added as new employee`
          : String(p);
    entries.push({ kind: "assignment", data: q, description });
  }

  for (const e of logbook) {
    if (!nameMatches(technician.name, e.employee_name_raw)) continue;
    entries.push({ kind: "note", data: e, description: e.body });
  }

  entries.sort((a, b) => b.data.created_at - a.data.created_at);

  const assignmentCount = entries.filter(e => e.kind === "assignment").length;
  const noteCount = entries.filter(e => e.kind === "note").length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/manager" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeftIcon className="size-3.5" />
          {company.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{technician.name}</span>
      </div>

      {/* Technician header */}
      <div>
        <h1 className="text-xl font-semibold">{technician.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {technician.title ?? "Technician"}{technician.email ? ` · ${technician.email}` : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3 min-w-[100px]">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Assignments</p>
          <p className="text-2xl font-semibold mt-0.5 text-skillcat-orange">{assignmentCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 min-w-[100px]">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Notes</p>
          <p className="text-2xl font-semibold mt-0.5">{noteCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 min-w-[100px]">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Photos</p>
          <p className="text-2xl font-semibold mt-0.5">{media.length}</p>
        </div>
      </div>

      {/* Photos */}
      {media.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Photos
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {media.length} {media.length === 1 ? "upload" : "uploads"}
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {media.map(m => (
              <a
                key={m.id}
                href={`/api/media?url=${encodeURIComponent(m.media_url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                title={m.caption ?? formatDate(m.created_at)}
              >
                <Image
                  src={`/api/media?url=${encodeURIComponent(m.media_url)}`}
                  alt={m.caption ?? "Technician upload"}
                  fill
                  className="object-cover transition-opacity group-hover:opacity-90"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Log entries */}
      <div>
        <h2 className="text-sm font-semibold mb-3">
          Activity Log
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </h2>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            No activity logged for {technician.name} yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{entry.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(entry.data.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span className={[
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                    entry.kind === "assignment"
                      ? "bg-skillcat-orange text-white"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}>
                    {entry.kind === "assignment" ? "Assignment" : "Note"}
                  </span>
                  <MessageSquareIcon className="size-3 text-muted-foreground/50" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
