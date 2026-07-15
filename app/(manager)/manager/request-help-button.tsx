"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitUrgentRequest } from "./urgent-request-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { LifeBuoyIcon } from "lucide-react";

export function RequestHelpButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitUrgentRequest(message);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Request sent. Our team will be in touch shortly.");
        setMessage("");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <LifeBuoyIcon className="size-3.5" />
        Request help
      </button>

      <Dialog open={open} onOpenChange={o => { if (!o) setOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request help</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="help_message">What do you need help with?</Label>
              <Textarea
                id="help_message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your issue — our customer success team will follow up."
                className="min-h-28"
                required
              />
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={pending || !message.trim()}>
                {pending ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
