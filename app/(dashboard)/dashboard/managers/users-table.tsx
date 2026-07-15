"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { InviteButton } from "./invite-button";
import type { ManagerRole } from "@/lib/supabase/db";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  reminder_preference: string | null;
  role: ManagerRole;
  companyName: string;
}

interface Company { id: string; name: string }

export function UsersTable({
  users,
  companies,
}: {
  users: UserRow[];
  companies: Company[];
}) {
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "manager" | "director">("");

  const filtered = users.filter(u => {
    if (companyFilter && u.companyName !== companyFilter) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  const selectClass =
    "h-8 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All companies</option>
          {companies.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as "" | "manager" | "director")}
          className={selectClass}
        >
          <option value="">All roles</option>
          <option value="manager">Manager</option>
          <option value="director">Director</option>
        </select>
        {(companyFilter || roleFilter) && (
          <button
            onClick={() => { setCompanyFilter(""); setRoleFilter(""); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No users match the selected filters.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Reminders</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.companyName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === "director" ? "default" : "outline"}
                      className="text-[10px] capitalize"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.phone
                      ? <span className="text-xs font-mono">{u.phone}</span>
                      : <Badge variant="outline" className="text-[10px]">Not set</Badge>}
                  </TableCell>
                  <TableCell>
                    <span className={[
                      "text-xs capitalize",
                      u.reminder_preference === "never" ? "text-muted-foreground" : "text-foreground",
                    ].join(" ")}>
                      {u.reminder_preference === "daily" ? "Daily at 5pm"
                        : u.reminder_preference === "weekly" ? "Fridays at 5pm"
                        : "Off"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <InviteButton managerId={u.id} />
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
