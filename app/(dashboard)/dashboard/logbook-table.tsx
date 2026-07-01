"use client";

import type { LogbookEntry } from "@/lib/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function parseTags(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function TagList({ raw }: { raw: string }) {
  const tags = parseTags(raw);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5">
          {tag}
        </Badge>
      ))}
    </div>
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

export function LogbookTable({ entries }: { entries: LogbookEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        No logbook entries yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Employee</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium text-sm whitespace-nowrap">
                {entry.employee_name_raw || <span className="text-muted-foreground">Unknown</span>}
              </TableCell>
              <TableCell className="max-w-sm whitespace-normal text-sm text-muted-foreground">
                {entry.body}
              </TableCell>
              <TableCell>
                <TagList raw={entry.tags} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">
                {entry.manager_phone}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatTime(entry.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
