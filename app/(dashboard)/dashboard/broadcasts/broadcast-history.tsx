import Link from "next/link";
import type { BroadcastSummary } from "@/lib/api";

function formatSent(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export function BroadcastHistory({ broadcasts }: { broadcasts: BroadcastSummary[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Sent broadcasts</h2>

      {broadcasts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          No broadcasts sent yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Sent</th>
                <th className="p-3 font-medium">Message</th>
                <th className="p-3 font-medium">Sent by</th>
                <th className="p-3 font-medium text-right">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map(b => (
                <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {formatSent(b.created_at)}
                  </td>
                  <td className="p-3 max-w-md">
                    <Link href={`/dashboard/broadcasts/${b.id}`} className="hover:text-skillcat-orange">
                      <span className="line-clamp-2">{b.body}</span>
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{b.sent_by}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <span className="font-medium">{b.sent_count}</span>
                    <span className="text-muted-foreground">/{b.recipient_count}</span>
                    {b.failed_count > 0 && (
                      <span className="ml-2 text-xs text-destructive">{b.failed_count} failed</span>
                    )}
                    {b.status === "sending" && (
                      <span className="ml-2 text-xs text-muted-foreground">sending…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
