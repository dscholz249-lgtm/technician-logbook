import { getCompanies } from "@/lib/supabase/db";
import { TestUsersTab } from "../test-users-tab";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await getCompanies().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Companies</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pilot companies, their managers, and technician rosters.
        </p>
      </div>
      <TestUsersTab companies={companies} />
    </div>
  );
}
