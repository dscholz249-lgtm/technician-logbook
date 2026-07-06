"use client";

import { useState } from "react";
import { sendManagerInvite } from "./actions";

export function InviteButton({ managerId }: { managerId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClick() {
    setState("sending");
    const result = await sendManagerInvite(managerId);
    if (result.error) {
      setErrorMsg(result.error);
      setState("error");
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return <span className="text-xs text-green-500 font-medium">Sent</span>;
  }

  if (state === "error") {
    return (
      <span className="text-xs text-destructive" title={errorMsg}>
        Failed
      </span>
    );
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
