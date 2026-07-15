"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resolveRequest } from "./actions";
import { Button } from "@/components/ui/button";

export function ResolveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await resolveRequest(id);
      if (result.error) toast.error(result.error);
      else toast.success("Marked as resolved.");
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={handle} disabled={pending}>
      {pending ? "Resolving…" : "Mark resolved"}
    </Button>
  );
}
