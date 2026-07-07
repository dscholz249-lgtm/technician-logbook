"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, MessageSquareIcon } from "lucide-react";
import type { LogItem } from "./page";

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2);
  return (
    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
      {initials.toUpperCase()}
    </div>
  );
}

function formatTime(ms: number) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

function parsePayload(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function itemDescription(item: LogItem): string {
  if (item.kind === "note") return item.data.body;
  const p = parsePayload(item.data.payload);
  if (item.data.type === "assign_training") {
    return `Assign ${p.employee_name} to the ${p.certification_name} training`;
  }
  if (item.data.type === "add_employee") {
    const e = p.new_employee as Record<string, string> | null ?? {};
    return `Add employee — ${e.name}${e.email ? `, ${e.email}` : ""}${e.title ? `, ${e.title}` : ""}`;
  }
  return "—";
}

interface TechGroup {
  name: string;
  assignmentCount: number;
  noteCount: number;
  items: LogItem[];
}

function TechRow({ group }: { group: TechGroup }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <Initials name={group.name} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{group.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {group.assignmentCount > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <span className="size-2 rounded-full bg-skillcat-orange" />
              {group.assignmentCount}
            </span>
          )}
          {group.noteCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-muted-foreground/40" />
              {group.noteCount}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-1">
            {group.items.length} {group.items.length === 1 ? "log" : "logs"}
          </span>
          {open
            ? <ChevronDownIcon className="size-4 text-muted-foreground" />
            : <ChevronRightIcon className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-2 pl-16 space-y-0.5">
          {group.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
              <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">
                {formatTime(item.data.created_at)}
              </span>
              <p className="flex-1 text-sm text-muted-foreground">{itemDescription(item)}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={[
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  item.kind === "assignment"
                    ? "bg-skillcat-orange text-white"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}>
                  {item.kind === "assignment" ? "Assignment" : "Note"}
                </span>
                <MessageSquareIcon className="size-3 text-muted-foreground/50" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TechLog({ groups }: { groups: TechGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        No activity yet. Text {" "}
        <span className="font-mono text-foreground">(251) 313-5407</span>
        {" "}to log your first update.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {groups.map(g => <TechRow key={g.name} group={g} />)}
    </div>
  );
}
