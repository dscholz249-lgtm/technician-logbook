import { ImageIcon } from "lucide-react";
import type { LogbookEntry } from "@/lib/types";

function parseBody(raw: string): { text: string; mediaUrls: string[] } {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.text === "string" && Array.isArray(p.media)) {
      return { text: p.text, mediaUrls: p.media.map((m: { url: string }) => m.url) };
    }
  } catch {}
  return { text: raw, mediaUrls: [] };
}

function formatTimestamp(ms: number): string {
  const now = Date.now();
  const date = new Date(ms);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (ms >= todayStart.getTime()) return `Today · ${time}`;
  if (ms >= yesterdayStart.getTime()) return `Yesterday · ${time}`;

  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${day} · ${time}`;
}

export function LogbookCard({ entry }: { entry: LogbookEntry }) {
  const { text, mediaUrls } = parseBody(entry.body);
  const hasMedia = mediaUrls.length > 0;
  const firstImage = hasMedia ? mediaUrls[0] : null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {hasMedia && (
        <div className="relative aspect-video bg-muted border-b border-border overflow-hidden">
          {firstImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media?url=${encodeURIComponent(firstImage)}`}
              alt="Logbook photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="size-8 text-muted-foreground/40" />
            </div>
          )}
          <span className="absolute top-2 left-2 text-[11px] font-semibold bg-black/60 backdrop-blur-sm border border-white/10 text-muted-foreground px-2 py-0.5 rounded-md">
            {mediaUrls.length > 1 ? `${mediaUrls.length} photos` : "Photo"}
          </span>
        </div>
      )}

      <div className="px-4 py-3 flex-1 flex flex-col gap-2">
        {text && (
          <p className="text-sm text-foreground leading-relaxed line-clamp-4">{text}</p>
        )}
        <p className="text-xs text-muted-foreground mt-auto">{formatTimestamp(entry.created_at)}</p>
      </div>
    </div>
  );
}

export function LogbookGrid({ entries }: { entries: LogbookEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
        Nothing logged yet. Text a photo or note to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {entries.map(e => <LogbookCard key={e.id} entry={e} />)}
    </div>
  );
}
