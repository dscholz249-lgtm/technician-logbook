"use client";

import { useMemo, useState } from "react";
import type { MessageLogEntry } from "@/lib/types";
import type { PhoneMeta } from "./page";

// ----------------------------------------------------------------- helpers

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)).toUpperCase();
}

const STEP_LABEL: Record<string, string> = {
  "confirm-assign": "assigned",
  "confirm-add": "added employee",
  "confirm-note": "logged note",
  "catalog-results": "catalog search",
  "catalog-empty": "no results",
  "clarify": "clarifying",
  "clarify-name": "name disambiguation",
  "clarify-course": "course disambiguation",
  "clarify-cert": "missing course",
  "fallback": "fallback",
  "help": "help",
  "actioned-notify": "actioned",
  "tech-no-media": "tech ack",
  "tech-media-saved": "photo saved",
  "tech-media-notify": "photo notify",
};

// ----------------------------------------------------------------- sub-components

function Bubble({ msg }: { msg: MessageLogEntry }) {
  const isIn = msg.direction === "in";
  const body = msg.body ?? "[media]";
  const stepLabel = msg.step_after ? STEP_LABEL[msg.step_after] ?? msg.step_after : null;

  return (
    <div className={`flex flex-col gap-0.5 max-w-[75%] ${isIn ? "self-start items-start" : "self-end items-end"}`}>
      <div
        className={[
          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isIn
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-skillcat-orange/15 text-foreground border border-skillcat-orange/20 rounded-tr-sm",
        ].join(" ")}
      >
        {body}
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
        {!isIn && stepLabel && (
          <span className="text-[10px] text-muted-foreground/60 font-mono">{stepLabel}</span>
        )}
      </div>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Thread({ messages }: { messages: MessageLogEntry[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No messages yet.
      </div>
    );
  }

  const withDividers: Array<{ type: "divider"; label: string } | { type: "msg"; msg: MessageLogEntry }> = [];
  let lastDate = "";
  for (const msg of messages) {
    const label = formatDate(msg.created_at);
    if (label !== lastDate) {
      withDividers.push({ type: "divider", label });
      lastDate = label;
    }
    withDividers.push({ type: "msg", msg });
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 min-h-0">
      {withDividers.map((item, i) =>
        item.type === "divider"
          ? <DateDivider key={`d-${i}`} label={item.label} />
          : <Bubble key={item.msg.id} msg={item.msg} />
      )}
    </div>
  );
}

function ConversationListItem({
  meta,
  lastMsg,
  unread,
  selected,
  onClick,
}: {
  meta: PhoneMeta;
  lastMsg: MessageLogEntry | null;
  unread: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-3 flex items-start gap-3 rounded-lg transition-colors",
        selected ? "bg-skillcat-orange/10" : "hover:bg-muted/50",
      ].join(" ")}
    >
      <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0 mt-0.5">
        {initials(meta.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-sm font-medium truncate ${selected ? "text-skillcat-orange" : ""}`}>
            {meta.name}
          </span>
          {lastMsg && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatTime(lastMsg.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground truncate">{meta.companyName}</span>
          <span className="text-[10px] text-muted-foreground/50">·</span>
          <span className="text-[10px] text-muted-foreground/60 capitalize">{meta.kind}</span>
        </div>
        {lastMsg && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {lastMsg.direction === "out" ? "↩ " : ""}{lastMsg.body ?? "[media]"}
          </p>
        )}
        {unread === 0 && !lastMsg && (
          <p className="text-xs text-muted-foreground/50 mt-0.5">No messages</p>
        )}
      </div>
      {unread > 0 && (
        <span className="text-[10px] font-semibold bg-skillcat-orange text-white rounded-full px-1.5 py-0.5 shrink-0">
          {unread}
        </span>
      )}
    </button>
  );
}

// ----------------------------------------------------------------- main

export function ConversationClient({
  messages,
  phoneMeta,
  companyNames,
}: {
  messages: MessageLogEntry[];
  phoneMeta: PhoneMeta[];
  companyNames: string[];
}) {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState("");
  const [search, setSearch] = useState("");

  const messagesByPhone = useMemo(() => {
    const map = new Map<string, MessageLogEntry[]>();
    for (const msg of messages) {
      if (!map.has(msg.manager_phone)) map.set(msg.manager_phone, []);
      map.get(msg.manager_phone)!.push(msg);
    }
    return map;
  }, [messages]);

  const filteredMeta = useMemo(() => {
    return phoneMeta.filter((m) => {
      if (companyFilter && m.companyName !== companyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.phone.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const aLast = messagesByPhone.get(a.phone)?.at(-1)?.created_at ?? "";
      const bLast = messagesByPhone.get(b.phone)?.at(-1)?.created_at ?? "";
      return bLast.localeCompare(aLast);
    });
  }, [phoneMeta, companyFilter, search, messagesByPhone]);

  const selectedMeta = phoneMeta.find((m) => m.phone === selectedPhone) ?? null;
  const selectedMessages = selectedPhone ? (messagesByPhone.get(selectedPhone) ?? []) : [];

  const selectClass = "h-8 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="flex gap-0 rounded-xl border border-border overflow-hidden flex-1 min-h-0" style={{ height: "calc(100vh - 200px)" }}>
      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col border-r border-border bg-card">
        <div className="p-3 border-b border-border space-y-2">
          <input
            type="text"
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className={`w-full ${selectClass}`}
          >
            <option value="">All companies</option>
            {companyNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredMeta.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No conversations found.</p>
          ) : (
            filteredMeta.map((meta) => {
              const msgs = messagesByPhone.get(meta.phone) ?? [];
              const lastMsg = msgs.at(-1) ?? null;
              return (
                <ConversationListItem
                  key={meta.phone}
                  meta={meta}
                  lastMsg={lastMsg}
                  unread={0}
                  selected={selectedPhone === meta.phone}
                  onClick={() => setSelectedPhone(meta.phone)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Thread panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {selectedMeta ? (
          <>
            <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
                {initials(selectedMeta.name)}
              </div>
              <div>
                <p className="text-sm font-medium">{selectedMeta.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedMeta.companyName} · <span className="font-mono">{selectedMeta.phone}</span>
                </p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                {selectedMessages.length} messages
              </div>
            </div>
            <Thread messages={selectedMessages} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a conversation to view messages.
          </div>
        )}
      </div>
    </div>
  );
}
