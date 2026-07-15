import { getCompanies } from "@/lib/supabase/db";
import { AddManagerModal } from "./add-manager-modal";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function ManagersPage() {
  const companies = await getCompanies().catch(() => []);
  const users = companies.flatMap(c =>
    c.managers.map(m => ({ ...m, companyName: c.name }))
  );
  const companyOptions = companies.map(c => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All managers and directors who can sign in and send SMS updates.
          </p>
        </div>
        <AddManagerModal companies={companyOptions} />
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No users yet. Add a company first.
        </div>
      ) : (
        <UsersTable users={users} companies={companyOptions} />
      )}
    </div>
  );
}
