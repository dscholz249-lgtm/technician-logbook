"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MailIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTechInviteEmailPreview, sendTechnicianInvite } from "@/app/(dashboard)/dashboard/technician-invite-actions";

type State = "idle" | "loading" | "preview" | "sending" | "sent";

interface Preview {
  html: string;
  firstName: string;
  email: string;
}

export function TechInviteButton({ technicianId, technicianName }: { technicianId: string; technicianName: string }) {
  const [state, setState] = useState<State>("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [, startTransition] = useTransition();

  function openPreview() {
    setState("loading");
    startTransition(async () => {
      const result = await getTechInviteEmailPreview(technicianId);
      if (result.error) {
        toast.error(result.error);
        setState("idle");
        return;
      }
      setPreview({ html: result.html!, firstName: result.firstName!, email: result.email! });
      setState("preview");
    });
  }

  function confirmSend() {
    setState("sending");
    startTransition(async () => {
      const result = await sendTechnicianInvite(technicianId);
      if (result.error) {
        toast.error(result.error);
        setState("preview");
        return;
      }
      toast.success(`Invite sent to ${preview?.firstName ?? technicianName}.`);
      setState("sent");
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-foreground"
        onClick={openPreview}
        disabled={state === "loading" || state === "sending" || state === "sent"}
      >
        <MailIcon className="size-3.5 mr-1" />
        {state === "loading" ? "Loading…" : state === "sent" ? "Sent" : "Send invite"}
      </Button>

      <Dialog open={state === "preview" || state === "sending"} onOpenChange={o => !o && setState("idle")}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Invite preview</DialogTitle>
            {preview && (
              <p className="text-sm text-muted-foreground mt-0.5">
                To: <span className="font-medium text-foreground">{preview.firstName}</span>{" "}
                &lt;{preview.email}&gt;
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-hidden rounded-lg border border-border min-h-0">
            {preview && (
              <iframe
                srcDoc={preview.html}
                sandbox="allow-same-origin"
                className="w-full h-full"
                style={{ minHeight: "480px" }}
                title="Email preview"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setState("idle")} disabled={state === "sending"}>
              Cancel
            </Button>
            <Button onClick={confirmSend} disabled={state === "sending"}>
              <SendIcon className="size-4 mr-1.5" />
              {state === "sending" ? "Sending…" : "Confirm & send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
