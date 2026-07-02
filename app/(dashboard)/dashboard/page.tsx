import { Suspense } from "react";
import { getQueue, getLogbook } from "@/lib/api";
import { getCompanies } from "@/lib/supabase/db";
import { QueueTable } from "./queue-table";
import { LogbookTable } from "./logbook-table";
import { TestUsersTab } from "./test-users-tab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [pending, actioned, logbook, companies] = await Promise.all([
    getQueue("pending").catch(() => []),
    getQueue("actioned").catch(() => []),
    getLogbook().catch(() => []),
    getCompanies().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Incoming SMS requests and field notes from your managers.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending actions" value={pending.length} highlight />
        <StatCard label="Actioned today" value={actioned.filter(isToday).length} />
        <StatCard label="Logbook entries" value={logbook.length} />
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Action Queue
            {pending.length > 0 && (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-skillcat-orange text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="actioned">Actioned</TabsTrigger>
          <TabsTrigger value="logbook">Logbook</TabsTrigger>
          <TabsTrigger value="test-users">
            Test Users
            {companies.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">({companies.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Suspense fallback={<TableSkeleton />}>
            <QueueTable items={pending} />
          </Suspense>
        </TabsContent>

        <TabsContent value="actioned" className="mt-4">
          <Suspense fallback={<TableSkeleton />}>
            <QueueTable items={actioned} showActioned />
          </Suspense>
        </TabsContent>

        <TabsContent value="logbook" className="mt-4">
          <Suspense fallback={<TableSkeleton />}>
            <LogbookTable entries={logbook} />
          </Suspense>
        </TabsContent>

        <TabsContent value="test-users" className="mt-4">
          <TestUsersTab companies={companies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-0.5 ${highlight && value > 0 ? "text-skillcat-orange" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function isToday(item: { actioned_at: number | null }): boolean {
  if (!item.actioned_at) return false;
  const d = new Date(item.actioned_at);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
