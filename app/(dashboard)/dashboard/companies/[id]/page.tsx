import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getCompanies } from "@/lib/supabase/db";
import { getAnalytics } from "@/lib/api";
import { CompanyCharts } from "./company-charts";

export const dynamic = "force-dynamic";

const EMPTY_ANALYTICS = {
  messages_by_day: [],
  requests_by_type: [],
  totals: { inbound_messages: 0, outbound_messages: 0, requests_total: 0, requests_actioned: 0 },
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companies = await getCompanies().catch(() => []);
  const company = companies.find(c => c.id === id);
  if (!company) notFound();

  const primaryPhone = company.managers[0]?.phone ?? null;
  const analytics = await getAnalytics(company.id, primaryPhone).catch(() => EMPTY_ANALYTICS);

  const { totals } = analytics;
  const actionRate =
    totals.requests_total > 0
      ? `${Math.round((totals.requests_actioned / totals.requests_total) * 100)}%`
      : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/companies"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Companies
        </Link>
        <h1 className="text-xl font-semibold">{company.name}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Inbound messages" value={totals.inbound_messages} />
        <StatCard label="Total requests" value={totals.requests_total} />
        <StatCard label="Requests actioned" value={totals.requests_actioned} />
        <StatCard label="Action rate" value={actionRate} />
      </div>

      {/* Charts */}
      <CompanyCharts data={analytics} />

      {/* Manager */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          {company.managers.length === 1 ? "Manager" : `Managers (${company.managers.length})`}
        </h2>
        {company.managers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No manager assigned.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {company.managers.map(m => (
              <div key={m.id} className="px-5 py-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p className="text-sm font-medium">{m.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm">{m.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-sm font-mono">{m.phone ?? <span className="text-muted-foreground not-italic">Not set</span>}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Technicians */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Technicians ({company.technicians.length})</h2>
        {company.technicians.length === 0 ? (
          <p className="text-sm text-muted-foreground">No technicians on file.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {company.technicians.map(t => (
                  <tr key={t.id} className="bg-card hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{t.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.email ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.title ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
