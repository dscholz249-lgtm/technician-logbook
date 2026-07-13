import { getCompanies } from "@/lib/supabase/db";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { InviteButton } from "./invite-button";
import { AddManagerModal } from "./add-manager-modal";

export const dynamic = "force-dynamic";

export default async function ManagersPage() {
  const companies = await getCompanies().catch(() => []);
  const managers = companies.flatMap(c =>
    c.managers.map(m => ({ ...m, companyName: c.name }))
  );
  const companyOptions = companies.map(c => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Field Managers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All managers who can sign in and send SMS updates.
          </p>
        </div>
        <AddManagerModal companies={companyOptions} />
      </div>

      {managers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No managers yet. Add a company first.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Reminders</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.companyName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    {m.phone
                      ? <span className="text-xs font-mono">{m.phone}</span>
                      : <Badge variant="outline" className="text-[10px]">Not set</Badge>}
                  </TableCell>
                  <TableCell>
                    <span className={[
                      "text-xs capitalize",
                      m.reminder_preference === "never" ? "text-muted-foreground" : "text-foreground",
                    ].join(" ")}>
                      {m.reminder_preference === "daily" ? "Daily at 5pm"
                        : m.reminder_preference === "weekly" ? "Fridays at 5pm"
                        : "Off"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <InviteButton managerId={m.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
