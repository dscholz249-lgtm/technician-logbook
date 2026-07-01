"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { QueueItem, AssignTrainingPayload, AddEmployeePayload } from "@/lib/types";
import { actionQueueItem } from "./actions";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function parsePayload(raw: string): AssignTrainingPayload | AddEmployeePayload | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function PayloadSummary({ type, raw }: { type: string; raw: string }) {
  const p = parsePayload(raw);
  if (!p) return <span className="text-muted-foreground text-xs">(unparseable)</span>;

  if (type === "assign_training") {
    const a = p as AssignTrainingPayload;
    return (
      <span className="text-xs">
        Assign <span className="font-medium">{a.employee_name}</span> →{" "}
        <span className="font-medium">{a.certification_name}</span>
      </span>
    );
  }

  if (type === "add_employee") {
    const a = p as AddEmployeePayload;
    return (
      <span className="text-xs">
        Add <span className="font-medium">{a.new_employee?.name}</span>{" "}
        ({a.new_employee?.title}) · {a.new_employee?.email}
      </span>
    );
  }

  return <span className="text-xs text-muted-foreground">{type}</span>;
}

function TypeBadge({ type }: { type: string }) {
  if (type === "assign_training") {
    return (
      <Badge className="bg-skillcat-blue/20 text-skillcat-blue border-skillcat-blue/30 border">
        Training
      </Badge>
    );
  }
  return (
    <Badge className="bg-skillcat-green/20 text-skillcat-green border-skillcat-green/30 border">
      Add employee
    </Badge>
  );
}

function formatTime(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

function ActionDialog({
  item,
  open,
  onOpenChange,
}: {
  item: QueueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await actionQueueItem(item.id, note);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Marked as actioned");
        onOpenChange(false);
        setNote("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as actioned</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          <PayloadSummary type={item.type} raw={item.payload} />
          <p className="text-xs text-muted-foreground">From {item.manager_phone}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea
            id="note"
            placeholder="What did you do to action this?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-20"
          />
        </div>
        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Mark actioned"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QueueTable({
  items,
  showActioned,
}: {
  items: QueueItem[];
  showActioned?: boolean;
}) {
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        {showActioned ? "No actioned items yet." : "No pending actions — nice work."}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Type</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Received</TableHead>
              {showActioned && <TableHead>Actioned by</TableHead>}
              {!showActioned && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <TypeBadge type={item.type} />
                </TableCell>
                <TableCell className="max-w-xs whitespace-normal">
                  <PayloadSummary type={item.type} raw={item.payload} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {item.manager_phone}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTime(item.created_at)}
                </TableCell>
                {showActioned && (
                  <TableCell className="text-xs text-muted-foreground">
                    {item.actioned_by ?? "—"}
                    {item.actioned_note && (
                      <span className="block text-muted-foreground/70">{item.actioned_note}</span>
                    )}
                  </TableCell>
                )}
                {!showActioned && (
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                    >
                      Mark actioned
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedItem && (
        <ActionDialog
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
        />
      )}
    </>
  );
}
