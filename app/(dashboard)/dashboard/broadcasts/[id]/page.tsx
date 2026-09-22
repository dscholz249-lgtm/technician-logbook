import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getBroadcast } from "@/lib/api";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  sent: "text-foreground",
  queued: "text-muted-foreground",
  failed: "text-destructive",
};

// Twilio's most common send failures, spelled out — an admin looking at this
// page should not have to go and look up the number.
const ERROR_LABEL: Record<string, string> = {
  "21610": "Recipient opted out (STOP)",
  "21211": "Invalid phone number",
  "21614": "Not a mobile number",
  "21408": "Region not enabled for sending",
  "30003": "Handset unreachable",
  "30005": "Unknown or inactive number",
  "30006": "Landline or unreachable carrier",
  "30007": "Carrier filtered as spam",
};

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const broadcastId = Number(id);
  if (Number.isNaN(broadcastId)) notFound();

  const broadcast = await getBroadcast(broadcastId).catch(() => null);
  if (!broadcast) notFound();

  const sent = broadcast.recipients.filter(r => r.status === "sent").length;
  const failed = broadcast.recipients.filter(r => r.status === "failed").length;
  const queued = broadcast.recipients.filter(r => r.status === "queued").length;

  return (
    <div className="space-y-6">
      {broadcast.status === "sending" && <AutoRefresh intervalMs={5000} />}

      <div>
        <Link
          href="/dashboard/broadcasts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" /> Broadcasts
        </Link>
        <h1 className="text-xl font-semibold mt-2">
          Broadcast #{broadcast.id}
          {broadcast.status === "sending" && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">sending…</span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sent by {broadcast.sent_by} ·{" "}
          {new Date(broadcast.created_at).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit",
          })}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-2">Message</p>
        <p className="whitespace-pre-wrap text-sm">{broadcast.body}</p>
      </div>

      <div className="flex gap-6 text-sm">
        <div><span className="font-semibold">{sent}</span> <span className="text-muted-foreground">delivered to carrier</span></div>
        {queued > 0 && <div><span className="font-semibold">{queued}</span> <span className="text-muted-foreground">queued</span></div>}
        {failed > 0 && <div><span className="font-semibold text-destructive">{failed}</span> <span className="text-muted-foreground">failed</span></div>}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Company</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {broadcast.recipients.map(r => (
              <tr key={r.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 font-medium">{r.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{r.company_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground font-mono text-xs">{r.phone}</td>
                <td className={`p-3 capitalize ${STATUS_STYLE[r.status] ?? ""}`}>
                  {r.status}
                  {r.error_code && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {ERROR_LABEL[r.error_code] ?? `Twilio error ${r.error_code}`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
