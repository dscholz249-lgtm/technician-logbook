"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { deleteLogEntryAsManager } from "./log-actions";

// Only rendered where canDeleteLog() allowed it; the action re-checks.
export function DeleteLogButton({
  entryId,
  companyId,
  className = "",
}: {
  entryId: number;
  companyId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLogEntryAsManager(entryId, companyId);
      if (result.error) toast.error(result.error);
      else { toast.success("Log deleted."); setOpen(false); }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Delete log"
        className={`text-muted-foreground/60 hover:text-destructive transition-colors ${className}`}
      >
        <Trash2Icon className="size-3.5" />
      </button>
      <Dialog open={open} onOpenChange={o => !o && !pending && setOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this log?</DialogTitle>
            <DialogDescription>
              It will be removed from the Logbook for everyone in your company.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
