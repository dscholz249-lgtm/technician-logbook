"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CompanyWithRelations, Manager } from "@/lib/supabase/db";
import {
  updateCompanyInfo, addManager, removeManager, addTechnicianToCompany,
} from "../../company-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

// ----------------------------------------------------------------- Company info

function EditCompanyInfoModal({
  company,
  open,
  onClose,
}: {
  company: CompanyWithRelations;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCompanyInfo(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("Company info updated."); onClose(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit company info</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="company_id" value={company.id} />
          <div className="space-y-1.5">
            <Label htmlFor="ci_company_name">Company name</Label>
            <Input id="ci_company_name" name="company_name" defaultValue={company.name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ci_industry">Industry <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="ci_industry" name="industry" defaultValue={company.industry ?? ""} placeholder="e.g. HVAC" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci_size">Size <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="ci_size" name="size" defaultValue={company.size ?? ""} placeholder="e.g. 12 employees" />
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

// ----------------------------------------------------------------- Manager row

function ManagerRow({ manager, companyId }: { manager: Manager; companyId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeManager(manager.id, companyId);
      if (result.error) toast.error(result.error);
      else toast.success(`${manager.name} removed.`);
      setConfirming(false);
    });
  }

  return (
    <div className="px-5 py-4 grid grid-cols-3 gap-4 group relative">
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Name</p>
        <p className="text-sm font-medium">{manager.name}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Email</p>
        <p className="text-sm">{manager.email}</p>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
          <p className="text-sm font-mono">{manager.phone ?? <span className="text-muted-foreground not-italic">Not set</span>}</p>
        </div>
        <div className="flex items-center gap-1 mt-0.5 ml-2">
          {confirming ? (
            <>
              <span className="text-xs text-muted-foreground mr-1">Remove?</span>
              <Button size="sm" variant="destructive" onClick={handleRemove} disabled={pending}>
                {pending ? "…" : "Yes"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>No</Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setConfirming(true)}
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- Add manager modal

function AddManagerModal({
  companyId,
  open,
  onClose,
}: {
  companyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("company_id", companyId);
    startTransition(async () => {
      const result = await addManager(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("Manager added."); onClose(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add manager</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="am_name">Name</Label>
              <Input id="am_name" name="manager_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="am_email">Email</Label>
              <Input id="am_email" name="manager_email" type="email" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="am_phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="am_phone" name="manager_phone" type="tel" placeholder="+1 555 000 0000" />
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add manager"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------- Add technician modal

function AddTechnicianModal({
  companyId,
  open,
  onClose,
}: {
  companyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("company_id", companyId);
    startTransition(async () => {
      const result = await addTechnicianToCompany(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("Technician added."); onClose(); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add technician</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="at_name">Name</Label>
            <Input id="at_name" name="technician_name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="at_email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="at_email" name="technician_email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="at_title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="at_title" name="technician_title" placeholder="e.g. HVAC Tech" />
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add technician"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------- Composed sections

export function CompanyInfoSection({ company }: { company: CompanyWithRelations }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Company info</h2>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
          <PencilIcon />
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-card px-5 py-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Industry</p>
          <p className="text-sm">{company.industry ?? <span className="text-muted-foreground">—</span>}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Size</p>
          <p className="text-sm">{company.size ?? <span className="text-muted-foreground">—</span>}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Technicians on file</p>
          <p className="text-sm">{company.technicians.length}</p>
        </div>
      </div>
      <EditCompanyInfoModal company={company} open={editOpen} onClose={() => setEditOpen(false)} />
    </section>
  );
}

export function ManagersSection({ company }: { company: CompanyWithRelations }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {company.managers.length === 1 ? "Manager" : `Managers (${company.managers.length})`}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <PlusIcon /> Add manager
        </Button>
      </div>
      {company.managers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No manager assigned.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {company.managers.map(m => (
            <ManagerRow key={m.id} manager={m} companyId={company.id} />
          ))}
        </div>
      )}
      <AddManagerModal companyId={company.id} open={addOpen} onClose={() => setAddOpen(false)} />
    </section>
  );
}

export function TechniciansSection({ company }: { company: CompanyWithRelations }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Technicians ({company.technicians.length})</h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <PlusIcon /> Add technician
        </Button>
      </div>
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
      <AddTechnicianModal companyId={company.id} open={addOpen} onClose={() => setAddOpen(false)} />
    </section>
  );
}
