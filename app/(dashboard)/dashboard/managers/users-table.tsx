"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { InviteButton } from "./invite-button";
import { updateUser, updateTechnician } from "../company-actions";
import { PencilIcon } from "lucide-react";
import type { ManagerRole } from "@/lib/supabase/db";

interface ManagerRow {
  kind: "manager";
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: ManagerRole;
  reminder_preference: string | null;
  companyName: string;
}

interface TechnicianRow {
  kind: "technician";
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  companyName: string;
}

type AnyUserRow = ManagerRow | TechnicianRow;

interface Company { id: string; name: string }

// ----------------------------------------------------------------- Edit modal

function EditManagerModal({
  user,
  open,
  onClose,
}: {
  user: ManagerRow;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateUser(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("User updated."); onClose(); }
    });
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="manager_id" value={user.id} />
          <input type="hidden" name="company_id" value={user.company_id} />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Company: <span className="text-foreground font-medium">{user.companyName}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eu_name">Name</Label>
              <Input id="eu_name" name="manager_name" defaultValue={user.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu_email">Email</Label>
              <Input id="eu_email" name="manager_email" type="email" defaultValue={user.email} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eu_phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="eu_phone" name="manager_phone" type="tel" defaultValue={user.phone ?? ""} placeholder="+1 555 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu_role">Role</Label>
              <select id="eu_role" name="manager_role" defaultValue={user.role} className={selectClass}>
                <option value="manager">Manager</option>
                <option value="director">Director</option>
              </select>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTechnicianModal({
  user,
  open,
  onClose,
}: {
  user: TechnicianRow;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateTechnician(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("Technician updated."); onClose(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit technician</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="technician_id" value={user.id} />
          <input type="hidden" name="company_id" value={user.company_id} />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Company: <span className="text-foreground font-medium">{user.companyName}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="et_name">Name</Label>
              <Input id="et_name" name="technician_name" defaultValue={user.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et_title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="et_title" name="technician_title" defaultValue={user.title ?? ""} placeholder="e.g. HVAC Tech" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="et_email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="et_email" name="technician_email" type="email" defaultValue={user.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et_phone">Phone <span className="text-muted-foreground text-xs">(for MMS)</span></Label>
              <Input id="et_phone" name="technician_phone" type="tel" defaultValue={user.phone ?? ""} placeholder="+1 555 000 0000" />
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------- Table

export function UsersTable({
  managers,
  technicians,
  companies,
}: {
  managers: ManagerRow[];
  technicians: TechnicianRow[];
  companies: Company[];
}) {
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "manager" | "director" | "technician">("");
  const [editing, setEditing] = useState<AnyUserRow | null>(null);

  const allUsers: AnyUserRow[] = [
    ...managers.sort((a, b) =>
      a.companyName.localeCompare(b.companyName) || (a.role === "director" ? -1 : 1) - (b.role === "director" ? -1 : 1) || a.name.localeCompare(b.name)
    ),
    ...technicians.sort((a, b) =>
      a.companyName.localeCompare(b.companyName) || a.name.localeCompare(b.name)
    ),
  ];

  const filtered = allUsers.filter(u => {
    if (companyFilter && u.companyName !== companyFilter) return false;
    if (roleFilter) {
      if (roleFilter === "technician" && u.kind !== "technician") return false;
      if (roleFilter !== "technician" && (u.kind !== "manager" || u.role !== roleFilter)) return false;
    }
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
          onChange={e => setRoleFilter(e.target.value as "" | "manager" | "director" | "technician")}
          className={selectClass}
        >
          <option value="">All roles</option>
          <option value="manager">Manager</option>
          <option value="director">Director</option>
          <option value="technician">Technician</option>
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
                <TableRow key={`${u.kind}-${u.id}`} className="group">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.companyName}</TableCell>
                  <TableCell>
                    {u.kind === "technician" ? (
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {u.title ?? "Technician"}
                      </Badge>
                    ) : (
                      <Badge
                        variant={u.role === "director" ? "default" : "outline"}
                        className="text-[10px] capitalize"
                      >
                        {u.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    {u.phone
                      ? <span className="text-xs font-mono">{u.phone}</span>
                      : <Badge variant="outline" className="text-[10px]">Not set</Badge>}
                  </TableCell>
                  <TableCell>
                    {u.kind === "manager" ? (
                      <span className={[
                        "text-xs capitalize",
                        u.reminder_preference === "never" ? "text-muted-foreground" : "text-foreground",
                      ].join(" ")}>
                        {u.reminder_preference === "daily" ? "Daily at 5pm"
                          : u.reminder_preference === "weekly" ? "Fridays at 5pm"
                          : "Off"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditing(u)}
                      >
                        <PencilIcon />
                      </Button>
                      {u.kind === "manager" && <InviteButton managerId={u.id} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editing?.kind === "manager" && (
        <EditManagerModal
          user={editing}
          open={true}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "technician" && (
        <EditTechnicianModal
          user={editing}
          open={true}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
