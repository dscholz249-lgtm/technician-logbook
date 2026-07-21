"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { setInterestStatus } from "./interest-actions";
import type { InterestRequest } from "@/lib/supabase/db";

const STATUS_LABELS: Record<InterestRequest["status"], string> = {
  pending: "Pending",
  contacted: "Contacted",
  created: "Account created",
};

const STATUS_VARIANTS: Record<InterestRequest["status"], "default" | "secondary" | "outline"> = {
  pending: "default",
  contacted: "secondary",
  created: "outline",
};

function StatusSelect({ request }: { request: InterestRequest }) {
  const [pending, startTransition] = useTransition();
  const selectClass =
    "h-7 rounded border border-input bg-transparent px-2 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <select
      className={selectClass}
      defaultValue={request.status}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value as InterestRequest["status"];
        startTransition(async () => {
          await setInterestStatus(request.id, status);
          toast.success("Status updated.");
        });
      }}
    >
      <option value="pending">Pending</option>
      <option value="contacted">Contacted</option>
      <option value="created">Account created</option>
    </select>
  );
}

export function InterestTable({ requests }: { requests: InterestRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
        No interest requests yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Team size</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <a href={`mailto:${r.email}`} className="hover:text-foreground transition-colors">
                  {r.email}
                </a>
              </TableCell>
              <TableCell className="text-sm">{r.company_name ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.team_size ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <StatusSelect request={r} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
