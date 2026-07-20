import { getCompanies } from "@/lib/supabase/db";
import { AddManagerModal } from "./add-manager-modal";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function ManagersPage() {
  const companies = await getCompanies().catch(() => []);
  const managers = companies.flatMap(c =>
    c.managers.map(m => ({ kind: "manager" as const, ...m, companyName: c.name }))
  );
  const technicians = companies.flatMap(c =>
    c.technicians.map(t => ({ kind: "technician" as const, ...t, companyName: c.name }))
  );
  const companyOptions = companies.map(c => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All managers, directors, and technicians across companies.
          </p>
        </div>
        <AddManagerModal companies={companyOptions} />
      </div>

      {managers.length === 0 && technicians.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No users yet. Add a company first.
        </div>
      ) : (
        <UsersTable managers={managers} technicians={technicians} companies={companyOptions} />
      )}
    </div>
  );
}
