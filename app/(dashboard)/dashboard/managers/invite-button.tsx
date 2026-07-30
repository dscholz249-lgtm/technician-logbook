"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendManagerInvite, getInviteEmailPreview } from "./actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function InviteButton({ managerId }: { managerId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "preview" | "sending" | "sent">("idle");
  const [preview, setPreview] = useState<{ html: string; firstName: string; email: string } | null>(null);

  async function handleOpenPreview() {
    setState("loading");
    const result = await getInviteEmailPreview(managerId);
    if (result.error || !result.html) {
      setState("idle");
      toast.error(result.error ?? "Could not load preview.");
      return;
    }
    setPreview({ html: result.html, firstName: result.firstName!, email: result.email! });
    setState("preview");
  }

  async function handleSend() {
    setState("sending");
    const result = await sendManagerInvite(managerId);
    if (result.error) {
      setState("preview");
      toast.error(result.error);
    } else {
      setState("sent");
      setPreview(null);
      toast.success("Invite sent.");
    }
  }

  if (state === "sent") {
    return <span className="text-xs text-green-500 font-medium">Sent</span>;
  }

  return (
    <>
      <button
        onClick={handleOpenPreview}
        disabled={state === "loading"}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {state === "loading" ? "Loading…" : "Send invite"}
      </button>

      <Dialog open={state === "preview" || state === "sending"} onOpenChange={(open) => { if (!open) setState("idle"); }}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-semibold">Invite email preview</DialogTitle>
            {preview && (
              <p className="text-xs text-muted-foreground mt-0.5">
                To: <span className="font-medium text-foreground">{preview.firstName}</span>{" "}
                &lt;{preview.email}&gt;
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {preview && (
              <iframe
                srcDoc={preview.html}
                title="Invite email preview"
                sandbox="allow-same-origin"
                className="w-full h-full border-0"
              />
            )}
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border shrink-0">
            <Button variant="ghost" onClick={() => setState("idle")} disabled={state === "sending"}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Confirm & send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
