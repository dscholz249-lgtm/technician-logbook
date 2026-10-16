"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeRequest, ignoreRequest } from "./actions";
import type { ActionStatus } from "@/lib/types";

export function RequestActions({
  id,
  exp,
  sig,
  status,
}: {
  id: number;
  exp?: string;
  sig?: string;
  status: ActionStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(kind: "complete" | "ignore") {
    startTransition(async () => {
      const result =
        kind === "complete"
          ? await completeRequest(id, exp, sig)
          : await ignoreRequest(id, exp, sig);
      if (result.error) toast.error(result.error);
      else toast.success(kind === "complete" ? "Marked complete — SMS sent" : "Ignored — no SMS sent");
      // Re-render either way: on a 409 the page should show who got there first.
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {status === "pending" && (
        <Button variant="outline" onClick={() => run("ignore")} disabled={pending}>
          Ignore
        </Button>
      )}
      <Button onClick={() => run("complete")} disabled={pending}>
        {pending ? "Saving…" : "Mark complete"}
      </Button>
    </div>
  );
}

// Rendered client-side so times show in the viewer's own timezone.
export function LocalTime({ ms }: { ms: number }) {
  return (
    <time dateTime={new Date(ms).toISOString()} suppressHydrationWarning>
      {new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(ms))}
    </time>
  );
}
