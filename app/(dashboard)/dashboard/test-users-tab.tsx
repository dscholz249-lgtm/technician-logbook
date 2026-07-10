"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CompanyWithRelations } from "@/lib/supabase/db";
import { saveCompany, removeCompany, syncAllCompanies } from "./company-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusIcon, PencilIcon, Trash2Icon, ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

function CompanyForm({
  company,
  onClose,
}: {
  company?: CompanyWithRelations;
  onClose: () => void;
}) {
  const manager = company?.managers[0];
  const techCsv = company?.technicians
    .map(t => [t.name, t.email ?? "", t.title ?? ""].join(","))
    .join("\n") ?? "";

  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveCompany(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(company ? "Company updated." : "Company added.");
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {company && <input type="hidden" name="company_id" value={company.id} />}
      {manager && <input type="hidden" name="manager_id" value={manager.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="company_name">Company name</Label>
        <Input id="company_name" name="company_name" defaultValue={company?.name} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="industry" name="industry" defaultValue={company?.industry ?? ""} placeholder="e.g. HVAC, Electrical" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="size">Size <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="size" name="size" defaultValue={company?.size ?? ""} placeholder="e.g. 12 employees" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="manager_name">Manager name</Label>
          <Input id="manager_name" name="manager_name" defaultValue={manager?.name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manager_email">Manager email</Label>
          <Input id="manager_email" name="manager_email" type="email" defaultValue={manager?.email} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manager_phone">
          Manager phone <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input id="manager_phone" name="manager_phone" type="tel" defaultValue={manager?.phone ?? ""} placeholder="+1 555 000 0000" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="technicians_csv">
          Technicians <span className="text-muted-foreground text-xs">CSV — Name, Email, Title (one per line)</span>
        </Label>
        <Textarea
          id="technicians_csv"
          name="technicians_csv"
          defaultValue={techCsv}
          placeholder={"John Smith, john@co.com, HVAC Tech\nMike Torres, mike@co.com, Refrigeration Tech"}
          className="min-h-32 font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">Paste directly from a spreadsheet. Replaces existing technicians on save.</p>
      </div>

      <DialogFooter showCloseButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : company ? "Save changes" : "Add company"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SyncButton() {
  const [pending, startTransition] = useTransition();
  function handleClick() {
    startTransition(async () => {
      const result = await syncAllCompanies();
      if (result.error) toast.error(`Sync failed: ${result.error}`);
      else toast.success(`Synced ${result.synced} company roster(s) to SMS bot.`);
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Syncing…" : "Sync roster"}
    </Button>
  );
}

function DeleteButton({ companyId, name }: { companyId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${name}" and all its managers and technicians?`)) return;
    startTransition(async () => {
      const result = await removeCompany(companyId);
      if (result.error) toast.error(result.error);
      else toast.success("Company deleted.");
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleClick} disabled={pending}>
      <Trash2Icon />
    </Button>
  );
}

export function TestUsersTab({ companies }: { companies: CompanyWithRelations[] }) {
  const [editing, setEditing] = useState<CompanyWithRelations | null | "new">(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pilot companies and their managers. Managers can sign in with their listed email.
        </p>
        <div className="flex items-center gap-2">
          <SyncButton />
          <Button size="sm" onClick={() => setEditing("new")}>
            <PlusIcon /> Add company
          </Button>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No companies yet. Add one to get started.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Company</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Technicians</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(c => {
                const m = c.managers[0];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{m?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m?.email ?? "—"}</TableCell>
                    <TableCell>
                      {m?.phone
                        ? <span className="text-xs font-mono">{m.phone}</span>
                        : <Badge variant="outline" className="text-[10px]">Not set</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.technicians.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)}>
                          <PencilIcon />
                        </Button>
                        <DeleteButton companyId={c.id} name={c.name} />
                        <Link
                          href={`/dashboard/companies/${c.id}`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                        >
                          <ArrowRightIcon />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add company" : `Edit ${(editing as CompanyWithRelations)?.name}`}</DialogTitle>
          </DialogHeader>
          {editing && (
            <CompanyForm
              company={editing === "new" ? undefined : editing}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
