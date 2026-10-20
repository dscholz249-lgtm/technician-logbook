"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { removeTechnicianAsManager, updateTechnicianAsManager } from "../technician-actions";
import type { Technician } from "@/lib/supabase/db";

export function TechnicianRowActions({ technician }: { technician: Technician }) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${technician.name}`}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <PencilIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setRemoving(true)}
        aria-label={`Remove ${technician.name}`}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2Icon className="size-3.5" />
      </button>
      {editing && <EditTechnicianDialog technician={technician} onClose={() => setEditing(false)} />}
      {removing && <RemoveTechnicianDialog technician={technician} onClose={() => setRemoving(false)} />}
    </>
  );
}

function EditTechnicianDialog({ technician, onClose }: { technician: Technician; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateTechnicianAsManager(fd);
      if (result.error) toast.error(result.error);
      else { toast.success("Technician updated."); onClose(); }
    });
  }

  return (
    <Dialog open onOpenChange={o => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit technician</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="technician_id" value={technician.id} />
          <div className="space-y-1.5">
            <Label htmlFor="et_name">Name</Label>
            <Input id="et_name" name="name" defaultValue={technician.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et_email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="et_email" name="email" type="email" defaultValue={technician.email ?? ""} />
            <p className="text-xs text-muted-foreground">They sign in to the Logbook with this email.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et_phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="et_phone" name="phone" type="tel" defaultValue={technician.phone ?? ""} placeholder="+1 555 000 0000" />
            <p className="text-xs text-muted-foreground">Texts to the SkillCat number are matched to them by this phone.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et_title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="et_title" name="title" defaultValue={technician.title ?? ""} />
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveTechnicianDialog({ technician, onClose }: { technician: Technician; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeTechnicianAsManager(technician.id);
      if (result.error) toast.error(result.error);
      else { toast.success(`${technician.name} removed.`); onClose(); }
    });
  }

  return (
    <Dialog open onOpenChange={o => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove {technician.name}?</DialogTitle>
          <DialogDescription>
            They&apos;ll lose access to the Logbook, and texts from their phone will no longer be
            matched to your company. Log entries already written aren&apos;t deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={handleRemove} disabled={pending}>
            {pending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
