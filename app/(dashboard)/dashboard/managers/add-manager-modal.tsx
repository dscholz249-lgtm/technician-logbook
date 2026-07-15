"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addManager } from "../company-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";

interface Company { id: string; name: string }

export function AddManagerModal({ companies }: { companies: Company[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addManager(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("Manager added."); setOpen(false); }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> Add user
      </Button>

      <Dialog open={open} onOpenChange={o => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fm_company">Company</Label>
              <select
                id="fm_company"
                name="company_id"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a company…</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fm_name">Name</Label>
                <Input id="fm_name" name="manager_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm_email">Email</Label>
                <Input id="fm_email" name="manager_email" type="email" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fm_phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="fm_phone" name="manager_phone" type="tel" placeholder="+1 555 000 0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm_role">Role</Label>
                <select
                  id="fm_role"
                  name="manager_role"
                  defaultValue="manager"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                </select>
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add user"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
