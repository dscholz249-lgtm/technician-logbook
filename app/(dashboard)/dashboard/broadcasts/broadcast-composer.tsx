"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SendIcon } from "lucide-react";
import { sendBroadcastAction } from "./actions";
import type { BroadcastCandidate } from "./page";

// Appended server-side by the Express layer. Counted here so the segment
// estimate reflects what actually goes out, not what was typed.
const OPT_OUT_FOOTER = "\n\nReply STOP to opt out.";

// GSM-7 is the 160-char alphabet; anything outside it forces the whole message
// to UCS-2, which more than halves the per-segment budget. Emoji and curly
// quotes pasted from a doc are the usual culprits.
const GSM_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€";

function isGsm7(text: string): boolean {
  for (const char of text) {
    if (!GSM_CHARS.includes(char) && !GSM_EXTENDED.includes(char)) return false;
  }
  return true;
}

function segmentInfo(text: string) {
  const gsm = isGsm7(text);
  // Extended GSM characters take two septets each.
  const length = gsm
    ? [...text].reduce((n, c) => n + (GSM_EXTENDED.includes(c) ? 2 : 1), 0)
    : [...text].length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi);
  return { gsm, length, segments };
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type Ineligibility = "no-phone" | "opted-out" | "reminders-off" | null;

// Why someone cannot be texted, or null if they can. Managers who set reminders
// to "never" have already said they don't want SMS from us, so they are out
// unless an admin deliberately overrides it.
function ineligibility(c: BroadcastCandidate, includeNeverRemind: boolean): Ineligibility {
  if (!c.phone) return "no-phone";
  if (c.optedOut) return "opted-out";
  if (!includeNeverRemind && c.reminderPreference === "never") return "reminders-off";
  return null;
}

export function BroadcastComposer({
  candidates,
  companies,
}: {
  candidates: BroadcastCandidate[];
  companies: { id: string; name: string }[];
}) {
  const [body, setBody] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [includeNeverRemind, setIncludeNeverRemind] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useRef<string>("");

  const visible = useMemo(
    () => candidates.filter(c =>
      (!companyFilter || c.companyId === companyFilter) &&
      (!roleFilter || c.role === roleFilter),
    ),
    [candidates, companyFilter, roleFilter],
  );

  const eligibleVisible = useMemo(
    () => visible.filter(c => ineligibility(c, includeNeverRemind) === null),
    [visible, includeNeverRemind],
  );

  // Selection survives filter changes, but only currently-eligible people are
  // ever sent to — unticking the override must drop them back out.
  const sendable = useMemo(
    () => candidates.filter(c => selected.has(c.id) && ineligibility(c, includeNeverRemind) === null),
    [candidates, selected, includeNeverRemind],
  );

  const exclusions = useMemo(() => {
    const counts = { noPhone: 0, optedOut: 0, remindersOff: 0 };
    for (const c of visible) {
      const reason = ineligibility(c, includeNeverRemind);
      if (reason === "no-phone") counts.noPhone++;
      else if (reason === "opted-out") counts.optedOut++;
      else if (reason === "reminders-off") counts.remindersOff++;
    }
    return counts;
  }, [visible, includeNeverRemind]);

  const allVisibleSelected =
    eligibleVisible.length > 0 && eligibleVisible.every(c => selected.has(c.id));

  function toggleAllVisible() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) eligibleVisible.forEach(c => next.delete(c.id));
      else eligibleVisible.forEach(c => next.add(c.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Must match the server's rule exactly (lib/broadcast.js withOptOutFooter),
  // or the preview shows a message that differs from what goes out.
  const trimmedBody = body.trim();
  const outgoing = /\bSTOP\b/.test(trimmedBody) ? trimmedBody : `${trimmedBody}${OPT_OUT_FOOTER}`;
  const { gsm, length, segments } = segmentInfo(outgoing);

  function openConfirm() {
    if (!body.trim()) return toast.error("Write a message first.");
    if (sendable.length === 0) return toast.error("Select at least one recipient.");
    // One key per confirmation, so a double-clicked Send is deduped by the API
    // but a deliberate second send later is not.
    idempotencyKey.current = crypto.randomUUID();
    setConfirmOpen(true);
  }

  function handleSend() {
    startTransition(async () => {
      const result = await sendBroadcastAction({
        body: body.trim(),
        managerIds: sendable.map(c => c.id),
        filter: {
          companyIds: companyFilter ? [companyFilter] : [],
          roles: roleFilter ? [roleFilter] : [],
          includeNeverRemind,
        },
        idempotencyKey: idempotencyKey.current,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }
      const extra = result.excludedOptOut
        ? ` ${result.excludedOptOut} excluded (opted out).`
        : "";
      toast.success(`Sending to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.${extra}`);
      setConfirmOpen(false);
      setBody("");
      setSelected(new Set());
    });
  }

  const selectClass =
    "h-8 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px] items-start">
      {/* Recipients */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by company"
          >
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="manager">Manager</option>
            <option value="director">Director</option>
          </select>
          <Button size="sm" variant="outline" onClick={toggleAllVisible} disabled={eligibleVisible.length === 0}>
            {allVisibleSelected ? "Clear" : "Select"} all {eligibleVisible.length > 0 && `(${eligibleVisible.length})`}
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {visible.length} shown
          </span>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-9 p-2" />
                <th className="p-2 font-medium">Name</th>
                <th className="p-2 font-medium">Company</th>
                <th className="p-2 font-medium">Role</th>
                <th className="p-2 font-medium">Phone</th>
                <th className="p-2 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                  No managers match these filters.
                </td></tr>
              )}
              {visible.map(c => {
                const reason = ineligibility(c, includeNeverRemind);
                const label =
                  reason === "no-phone" ? "No phone number"
                  : reason === "opted-out" ? "Opted out"
                  : reason === "reminders-off" ? "Reminders off"
                  : null;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-border/50 last:border-0 ${reason ? "opacity-50" : "hover:bg-muted/40"}`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        disabled={reason !== null}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.name}`}
                        className="size-4 accent-skillcat-orange"
                      />
                    </td>
                    <td className="p-2">
                      <span className="font-medium">{c.name}</span>
                      {label && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {label}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">{c.companyName}</td>
                    <td className="p-2 text-muted-foreground capitalize">{c.role}</td>
                    <td className="p-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {c.phone ?? "—"}
                    </td>
                    <td className="p-2 text-muted-foreground">{formatLastActive(c.lastActiveAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Composer */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="broadcast_body">Message</Label>
          <Textarea
            id="broadcast_body"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="Haven't seen you in a while — text me a photo from today's job and I'll log it."
          />
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {length} characters · {segments} segment{segments === 1 ? "" : "s"}
            {!gsm && <span className="text-amber-600 dark:text-amber-500"> · non-GSM characters shorten segments to 70</span>}
          </p>
          <p className="italic">&ldquo;Reply STOP to opt out.&rdquo; is appended automatically.</p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs">
          <p className="text-sm font-medium text-foreground">
            Sending to {sendable.length} recipient{sendable.length === 1 ? "" : "s"}
          </p>
          {exclusions.noPhone > 0 && <p className="text-muted-foreground">{exclusions.noPhone} excluded — no phone number</p>}
          {exclusions.optedOut > 0 && <p className="text-muted-foreground">{exclusions.optedOut} excluded — opted out of SMS</p>}
          {exclusions.remindersOff > 0 && (
            <p className="text-muted-foreground">{exclusions.remindersOff} excluded — reminders set to never</p>
          )}
          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNeverRemind}
              onChange={e => setIncludeNeverRemind(e.target.checked)}
              className="size-3.5 mt-0.5 accent-skillcat-orange"
            />
            <span className="text-muted-foreground">
              Include managers who set reminders to &ldquo;never&rdquo;
            </span>
          </label>
        </div>

        <Button className="w-full" onClick={openConfirm} disabled={pending}>
          <SendIcon /> Review and send
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={o => !o && setConfirmOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send to {sendable.length} recipient{sendable.length === 1 ? "" : "s"}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">
              This sends immediately as {segments} SMS segment{segments === 1 ? "" : "s"} each. It cannot be recalled.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3 whitespace-pre-wrap text-sm">
              {outgoing}
            </div>
            <p className="text-xs text-muted-foreground max-h-24 overflow-y-auto">
              {sendable.map(c => c.name).join(", ")}
            </p>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleSend} disabled={pending}>
              {pending ? "Sending…" : `Send to ${sendable.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
