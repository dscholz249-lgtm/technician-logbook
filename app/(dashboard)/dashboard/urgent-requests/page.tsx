import { getUrgentRequests } from "@/lib/supabase/db";
import type { UrgentRequest } from "@/lib/supabase/db";
import { ResolveButton } from "./resolve-button";
import { Badge } from "@/components/ui/badge";
import { SirenIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function RequestCard({ req }: { req: UrgentRequest }) {
  const date = new Date(req.created_at).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{req.manager_name}</span>
            <Badge variant={req.status === "open" ? "destructive" : "outline"} className="text-[10px]">
              {req.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{req.company_name} · {req.manager_email} · {date}</p>
        </div>
        {req.status === "open" && <ResolveButton id={req.id} />}
      </div>
      <p className="text-sm bg-muted/40 rounded-lg px-3 py-2.5 leading-relaxed">{req.message}</p>
    </div>
  );
}

export default async function UrgentRequestsPage() {
  const requests = await getUrgentRequests().catch(() => [] as UrgentRequest[]);
  const open = requests.filter(r => r.status === "open");
  const resolved = requests.filter(r => r.status === "resolved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <SirenIcon className="size-5 text-destructive" />
          Urgent Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Help requests submitted by field managers and directors.
        </p>
      </div>

      {open.length === 0 && resolved.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No requests yet.
        </div>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-destructive">Open ({open.length})</h2>
              {open.map(r => <RequestCard key={r.id} req={r} />)}
            </section>
          )}
          {resolved.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Resolved ({resolved.length})</h2>
              {resolved.map(r => <RequestCard key={r.id} req={r} />)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
