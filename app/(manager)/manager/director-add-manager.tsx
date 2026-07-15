"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addManagerAsDirector } from "./director-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { UserPlusIcon } from "lucide-react";

export function DirectorAddManager() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addManagerAsDirector(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("Manager added."); setOpen(false); }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlusIcon className="size-3.5" /> Add manager
      </Button>

      <Dialog open={open} onOpenChange={o => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add manager to your company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dir_name">Name</Label>
                <Input id="dir_name" name="manager_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dir_email">Email</Label>
                <Input id="dir_email" name="manager_email" type="email" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dir_phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="dir_phone" name="manager_phone" type="tel" placeholder="+1 555 000 0000" />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add manager"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
