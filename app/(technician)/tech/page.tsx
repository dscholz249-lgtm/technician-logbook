import { createClient } from "@/lib/supabase/server";
import { getTechnicianByEmail } from "@/lib/supabase/db";
import { getLogbook, getTechnicianMedia } from "@/lib/api";
import { AutoRefresh } from "@/components/auto-refresh";
import { TechPhoneForm } from "./tech-phone-form";
import { ContactCardSection } from "@/app/(manager)/manager/contact-card-section";
import { CameraIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";
import type { LogbookEntry } from "@/lib/types";
import type { TechnicianMedia } from "@/lib/api";

export const dynamic = "force-dynamic";

const SKILLCAT_SMS_NUMBER = (process.env.SKILLCAT_SMS_PHONE ?? "(251) 313-5407").replace(/^["']|["']$/g, "");

function parseBody(raw: string): { text: string; mediaUrls: string[] } {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.text === "string" && Array.isArray(p.media)) {
      return { text: p.text, mediaUrls: p.media.map((m: { url: string }) => m.url) };
    }
  } catch {}
  return { text: raw, mediaUrls: [] };
}

function formatDate(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

type TimelineItem =
  | { kind: "entry"; data: LogbookEntry }
  | { kind: "media"; data: TechnicianMedia };

export default async function TechPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const technician = await getTechnicianByEmail(user!.email!);
  if (!technician) return null;

  const [logbook, media] = await Promise.all([
    getLogbook(technician.company_id, undefined, technician.id).catch(() => [] as LogbookEntry[]),
    getTechnicianMedia(technician.company_id, technician.id, technician.phone).catch(() => [] as TechnicianMedia[]),
  ]);

  // Build a unified timeline: logbook entries (which already include media URLs in body JSON)
  // are the source of truth for the history. Media rows are a secondary index; skip them
  // here to avoid duplicates — the logbook body already carries the Twilio URLs.
  const timeline: TimelineItem[] = logbook.map(e => ({ kind: "entry" as const, data: e }));
  timeline.sort((a, b) => b.data.created_at - a.data.created_at);

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div>
        <h1 className="text-xl font-semibold">{technician.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {technician.title ?? "Technician"}
        </p>
      </div>

      {/* Phone + Contact Card */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <PhoneIcon className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Your phone number</p>
        </div>
        <TechPhoneForm currentPhone={technician.phone} />
        {process.env.SKILLCAT_SMS_PHONE && <ContactCardSection />}
      </div>

      {/* How to submit */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <CameraIcon className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Submitting photos &amp; updates</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Text or send photos directly to{" "}
          <span className="font-mono font-medium text-foreground">{SKILLCAT_SMS_NUMBER}</span>.
          Everything you send is saved here and visible to your manager.
        </p>
        <div className="space-y-2">
          {[
            { n: "01", title: "Send a photo", body: "Text any image to the SkillCat number and it will be logged to your profile." },
            { n: "02", title: "Leave a note", body: "Send a text update — job status, site condition, anything relevant — and it's added to your log." },
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
      </div>

      {/* Message history */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Your messages</h2>
          <span className="text-xs text-muted-foreground">
            {timeline.length} {timeline.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {timeline.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            Nothing yet. Text{" "}
            <span className="font-mono text-foreground">{SKILLCAT_SMS_NUMBER}</span>{" "}
            to log your first update.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
            {timeline.map(item => {
              const entry = item.data as LogbookEntry;
              const { text, mediaUrls } = parseBody(entry.body);
              const hasMedia = mediaUrls.length > 0;
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    {text && (
                      <p className="text-sm text-foreground">{text}</p>
                    )}
                    {hasMedia && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mediaUrls.map((url, j) => (
                          <a
                            key={j}
                            href={`/api/media?url=${encodeURIComponent(url)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block size-20 rounded-md overflow-hidden border border-border bg-muted shrink-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/media?url=${encodeURIComponent(url)}`}
                              alt="Your upload"
                              className="size-full object-cover hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                  <span className={[
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5",
                    hasMedia ? "bg-skillcat-orange/10 text-skillcat-orange" : "bg-muted text-muted-foreground",
                  ].join(" ")}>
                    {hasMedia ? "Photo" : "Text"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AutoRefresh intervalMs={30000} />
    </div>
  );
}
