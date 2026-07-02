import { getLogbook } from "@/lib/api";
import { LogbookTable } from "../logbook-table";

export const dynamic = "force-dynamic";

export default async function LogbookPage() {
  const entries = await getLogbook().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Logbook Entries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          All field notes from managers across every company.
        </p>
      </div>
      <LogbookTable entries={entries} />
    </div>
  );
}
