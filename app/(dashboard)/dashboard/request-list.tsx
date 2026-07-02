"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { actionQueueItem } from "./actions";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import type { CompanyGroup, UnifiedItem } from "./page";
import type { QueueItem, LogbookEntry } from "@/lib/types";

function formatTime(ms: number) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

function parsePayload(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function itemDescription(item: UnifiedItem): { name: string; description: string } {
  if (item.kind === "note") {
    return { name: item.data.employee_name_raw || "—", description: item.data.body };
  }
  const p = parsePayload(item.data.payload);
  if (item.data.type === "assign_training") {
    return {
      name: String(p.employee_name ?? "—"),
      description: `Assign ${p.employee_name} to the ${p.certification_name} training`,
    };
  }
  if (item.data.type === "add_employee") {
    const e = p.new_employee as Record<string, string> | null ?? {};
    return {
      name: e.name ?? "—",
      description: `Add employee — ${e.name}${e.email ? `, ${e.email}` : ""}${e.title ? `, ${e.title}` : ""}`,
    };
  }
  return { name: "—", description: String(p) };
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2);
  return (
    <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
      {initials.toUpperCase()}
    </div>
  );
}

function MarkCompleteButton({ item }: { item: QueueItem }) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await actionQueueItem(item.id);
      if (result.error) toast.error(result.error);
      else toast.success("Marked complete");
    });
  }

  return (
    <Button size="sm" onClick={handle} disabled={pending}>
      {pending ? "Saving…" : "Mark Complete"}
    </Button>
  );
}

function RequestRow({ item }: { item: UnifiedItem }) {
  const { name, description } = itemDescription(item);
  const isAction = item.kind === "action";
  const isPending = isAction && (item.data as QueueItem).status === "pending";
  const ts = item.kind === "action" ? item.data.created_at : item.data.created_at;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-14 shrink-0 pt-0.5">{formatTime(ts)}</span>
      <Initials name={name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <span className={[
            "inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold",
            isAction
              ? "bg-skillcat-orange text-white"
              : "bg-muted text-muted-foreground",
          ].join(" ")}>
            {isAction ? "Assignment" : "Note"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">
        {isPending
          ? <MarkCompleteButton item={item.data as QueueItem} />
          : <span className="text-xs text-muted-foreground">No action needed</span>}
      </div>
    </div>
  );
}

function ManagerSection({ manager }: { manager: CompanyGroup["managers"][number] }) {
  const total = manager.items.length;
  return (
    <div className="border-b border-border/60 last:border-0">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30">
        <Initials name={manager.name} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{manager.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">Field Manager · {manager.phone}</span>
        </div>
        <span className="text-xs text-muted-foreground">{total} {total === 1 ? "request" : "requests"}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </div>
      <div className="px-4">
        {manager.items.map((item, i) => (
          <RequestRow key={`${item.kind}-${item.kind === "action" ? item.data.id : item.data.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export function RequestList({ groups }: { groups: CompanyGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
        No requests yet. When managers text in, they'll appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(company => (
        <div key={company.id} className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Company header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
            <div>
              <span className="text-sm font-semibold">{company.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {company.managers.length} {company.managers.length === 1 ? "manager" : "managers"}
              </span>
            </div>
            {company.pendingCount > 0 && (
              <span className="text-xs font-semibold text-skillcat-orange">
                {company.pendingCount} pending
              </span>
            )}
          </div>

          {/* Manager sections */}
          {company.managers.map(manager => (
            <ManagerSection key={manager.phone} manager={manager} />
          ))}
        </div>
      ))}
    </div>
  );
}
