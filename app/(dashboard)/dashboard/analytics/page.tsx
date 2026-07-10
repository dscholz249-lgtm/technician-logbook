import { getCompanies } from "@/lib/supabase/db";
import { getGlobalAnalytics } from "@/lib/api";
import { AnalyticsCharts } from "./analytics-charts";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  assign_training: "Assign training",
  add_employee:    "Add technician",
  log_note:        "Log note",
  human_review:    "Human review",
};

function pct(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export default async function AnalyticsPage() {
  const [analytics, companies] = await Promise.all([
    getGlobalAnalytics().catch(() => null),
    getCompanies().catch(() => []),
  ]);

  const ret = analytics?.retention;
  const totalRequests = analytics?.requests_by_type.reduce((s, r) => s + r.total, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aggregate SMS activity across all pilot companies.
        </p>
      </div>

      {/* Stats — engagement */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="DAU (today)" value={analytics?.dau ?? 0} />
        <StatCard label="MAU (30 days)" value={analytics?.mau ?? 0} />
        <StatCard label="Total requests" value={totalRequests} />
        <StatCard label="Companies" value={companies.length} />
        <StatCard label="Total managers" value={ret?.total_managers ?? 0} />
      </div>

      {/* Retention */}
      <div className="grid grid-cols-3 gap-3">
        <RetentionCard label="2-day retention" value={pct(ret?.day_2 ?? null)} />
        <RetentionCard label="7-day retention" value={pct(ret?.day_7 ?? null)} />
        <RetentionCard label="30-day retention" value={pct(ret?.day_30 ?? null)} />
      </div>

      {/* Charts */}
      {analytics ? (
        <AnalyticsCharts data={analytics} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Could not load analytics data.
        </div>
      )}

      {/* Company breakdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Company breakdown</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Industry</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Size</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Manager</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Technicians</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Phone set</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map(c => {
                const m = c.managers[0];
                return (
                  <tr key={c.id} className="bg-card hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.industry ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.size ?? "—"}</td>
                    <td className="px-4 py-2.5">{m?.name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5 tabular-nums">{c.technicians.length}</td>
                    <td className="px-4 py-2.5">
                      {m?.phone
                        ? <span className="text-emerald-500 text-xs font-medium">✓ Yes</span>
                        : <span className="text-muted-foreground text-xs">No</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Request type breakdown */}
      {analytics && analytics.requests_by_type.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Requests by type</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actioned</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Action rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.requests_by_type.map(r => (
                  <tr key={r.type} className="bg-card hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{TYPE_LABELS[r.type] ?? r.type}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.total}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.actioned}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {r.total > 0 ? `${Math.round((r.actioned / r.total) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
    </div>
  );
}

function RetentionCard({ label, value }: { label: string; value: string }) {
  const isSet = value !== "—";
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${isSet ? "text-foreground" : "text-muted-foreground"}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">of managers returned</p>
    </div>
  );
}
