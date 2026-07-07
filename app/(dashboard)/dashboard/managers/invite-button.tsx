"use client";

import { useState } from "react";
import { toast } from "sonner";
import { sendManagerInvite } from "./actions";

export function InviteButton({ managerId }: { managerId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleClick() {
    setState("sending");
    const result = await sendManagerInvite(managerId);
    if (result.error) {
      setState("idle");
      toast.error(result.error);
    } else {
      setState("sent");
      toast.success("Invite sent.");
    }
  }

  if (state === "sent") {
    return <span className="text-xs text-green-500 font-medium">Sent</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "sending"}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {state === "sending" ? "Sending..." : "Send invite"}
    </button>
  );
}
