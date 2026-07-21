"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import type { CompanyWithRelations, Manager } from "@/lib/supabase/db";
import { saveCompany, removeCompany, syncAllCompanies, addManager, removeManager } from "./company-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusIcon, PencilIcon, Trash2Icon, ArrowRightIcon, UserPlusIcon, LinkIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

function ManagerRow({ manager, companyId }: { manager: Manager; companyId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeManager(manager.id, companyId);
      if (result.error) toast.error(result.error);
      else toast.success(`${manager.name} removed.`);
      setConfirming(false);
    });
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/40 group">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{manager.name}</p>
        <p className="text-xs text-muted-foreground truncate">{manager.email}{manager.phone ? ` · ${manager.phone}` : ""}</p>
      </div>
      <div className="flex items-center gap-1 ml-2 shrink-0">
        {confirming ? (
          <>
            <span className="text-xs text-muted-foreground mr-1">Remove?</span>
            <Button size="sm" variant="destructive" onClick={handleRemove} disabled={pending}>
              {pending ? "Removing…" : "Yes"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              No
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
    </div>
  );
}

function AddManagerForm({ companyId, onAdded }: { companyId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("company_id", companyId);
    startTransition(async () => {
      const result = await addManager(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Manager added.");
        e.currentTarget.reset();
        setOpen(false);
        onAdded();
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <UserPlusIcon className="size-3.5" /> Add manager
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New manager</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="add_manager_name" className="text-xs">Name</Label>
          <Input id="add_manager_name" name="manager_name" required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="add_manager_email" className="text-xs">Email</Label>
          <Input id="add_manager_email" name="manager_email" type="email" required className="h-8 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="add_manager_phone" className="text-xs">Phone <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="add_manager_phone" name="manager_phone" type="tel" placeholder="+1 555 000 0000" className="h-8 text-sm" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

function CsvUploadButton({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (textareaRef.current) textareaRef.current.value = ev.target?.result as string;
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <UploadIcon className="size-3" /> Upload file
      </button>
    </>
  );
}

function CompanyForm({
  company,
  onClose,
}: {
  company?: CompanyWithRelations;
  onClose: () => void;
}) {
  const isEdit = !!company;
  const techCsv = company?.technicians
    .map(t => [t.name, t.email ?? "", t.title ?? ""].join(","))
    .join("\n") ?? "";

  const [createMode, setCreateMode] = useState<"manual" | "csv">("manual");
  const [pending, startTransition] = useTransition();

  // Refs for file upload → textarea injection
  const directorsCsvRef = useRef<HTMLTextAreaElement>(null);
  const managersCsvRef = useRef<HTMLTextAreaElement>(null);
  const techniciansCsvRef = useRef<HTMLTextAreaElement>(null);
  const peopleCsvRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!isEdit) fd.set("create_mode", createMode);
    startTransition(async () => {
      const result = await saveCompany(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(company ? "Company updated." : "Company added.");
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {company && <input type="hidden" name="company_id" value={company.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="company_name">Company name</Label>
        <Input id="company_name" name="company_name" defaultValue={company?.name} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="industry" name="industry" defaultValue={company?.industry ?? ""} placeholder="e.g. HVAC, Electrical" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="size">Size <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input id="size" name="size" defaultValue={company?.size ?? ""} placeholder="e.g. 12 employees" />
        </div>
      </div>

      {isEdit ? (
        /* Edit path: existing managers list + add form + technicians CSV */
        <>
          <div className="space-y-2">
            <Label>Users</Label>
            <div className="rounded-lg border border-border divide-y divide-border">
              {company.managers.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">No active users.</p>
              ) : (
                company.managers.map(m => (
                  <ManagerRow key={m.id} manager={m} companyId={company.id} />
                ))
              )}
            </div>
            <AddManagerForm companyId={company.id} onAdded={() => {}} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="technicians_csv">
                Technicians <span className="text-muted-foreground text-xs">CSV — Name, Email, Title (one per line)</span>
              </Label>
              <CsvUploadButton textareaRef={techniciansCsvRef} />
            </div>
            <Textarea
              ref={techniciansCsvRef}
              id="technicians_csv"
              name="technicians_csv"
              defaultValue={techCsv}
              placeholder={"John Smith, john@co.com, HVAC Tech\nMike Torres, mike@co.com, Refrigeration Tech"}
              className="min-h-28 max-h-60 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Replaces existing technicians on save.</p>
          </div>
        </>
      ) : (
        /* Create path: tab toggle between manual and CSV import */
        <>
          {/* Tab toggle */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-muted w-fit">
            {(["manual", "csv"] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setCreateMode(mode)}
                className={[
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  createMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {mode === "manual" ? "Manual" : "CSV Import"}
              </button>
            ))}
          </div>

          {createMode === "manual" ? (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="directors_csv">
                    Directors <span className="text-muted-foreground text-xs">Name, Email, Phone (one per line)</span>
                  </Label>
                  <CsvUploadButton textareaRef={directorsCsvRef} />
                </div>
                <Textarea
                  ref={directorsCsvRef}
                  id="directors_csv"
                  name="directors_csv"
                  placeholder={"Jane Smith, jane@co.com, +1 555 000 0001"}
                  className="min-h-20 max-h-60 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="managers_csv">
                    Managers <span className="text-muted-foreground text-xs">Name, Email, Phone (one per line)</span>
                  </Label>
                  <CsvUploadButton textareaRef={managersCsvRef} />
                </div>
                <Textarea
                  ref={managersCsvRef}
                  id="managers_csv"
                  name="managers_csv"
                  placeholder={"John Smith, john@co.com, +1 555 000 0000\nMike Torres, mike@co.com"}
                  className="min-h-20 max-h-60 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">At least one director or manager is required.</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="technicians_csv">
                    Technicians <span className="text-muted-foreground text-xs">Name, Email, Title (one per line, optional)</span>
                  </Label>
                  <CsvUploadButton textareaRef={techniciansCsvRef} />
                </div>
                <Textarea
                  ref={techniciansCsvRef}
                  id="technicians_csv"
                  name="technicians_csv"
                  placeholder={"Alex Rivera, alex@co.com, HVAC Tech\nSam Lee, sam@co.com, Refrigeration Tech"}
                  className="min-h-20 max-h-60 font-mono text-xs"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="people_csv">
                  All people <span className="text-muted-foreground text-xs">Role, Name, Email, Phone/Title (one per line)</span>
                </Label>
                <CsvUploadButton textareaRef={peopleCsvRef} />
              </div>
              <Textarea
                ref={peopleCsvRef}
                id="people_csv"
                name="people_csv"
                placeholder={[
                  "director, Jane Smith, jane@co.com, +1 555 000 0001",
                  "manager, John Smith, john@co.com, +1 555 000 0000",
                  "technician, Alex Rivera, alex@co.com, HVAC Tech",
                ].join("\n")}
                className="min-h-40 max-h-60 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Roles: <code className="bg-muted px-0.5 rounded">director</code>, <code className="bg-muted px-0.5 rounded">manager</code>, <code className="bg-muted px-0.5 rounded">technician</code>.
                {" "}4th column is phone for directors/managers, job title for technicians.
              </p>
            </div>
          )}
        </>
      )}

      <DialogFooter showCloseButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : company ? "Save changes" : "Add company"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CopyLinkButton({ companyId }: { companyId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/join/${companyId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy invite link"}
    >
      <LinkIcon className={copied ? "text-skillcat-orange" : ""} />
    </Button>
  );
}

function SyncButton() {
  const [pending, startTransition] = useTransition();
  function handleClick() {
    startTransition(async () => {
      const result = await syncAllCompanies();
      if (result.error) toast.error(`Sync failed: ${result.error}`);
      else toast.success(`Synced ${result.synced} company roster(s) to SMS bot.`);
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Syncing…" : "Sync roster"}
    </Button>
  );
}

function DeleteButton({ companyId, name }: { companyId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${name}" and all its managers and technicians?`)) return;
    startTransition(async () => {
      const result = await removeCompany(companyId);
      if (result.error) toast.error(result.error);
      else toast.success("Company deleted.");
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleClick} disabled={pending}>
      <Trash2Icon />
    </Button>
  );
}

export function TestUsersTab({ companies }: { companies: CompanyWithRelations[] }) {
  const [editing, setEditing] = useState<CompanyWithRelations | null | "new">(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pilot companies and their managers. Managers can sign in with their listed email.
        </p>
        <div className="flex items-center gap-2">
          <SyncButton />
          <Button size="sm" onClick={() => setEditing("new")}>
            <PlusIcon /> Add company
          </Button>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No companies yet. Add one to get started.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Company</TableHead>
                <TableHead>Managers</TableHead>
                <TableHead>Technicians</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div>{c.name}</div>
                    {(c.industry || c.size) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[c.industry, c.size].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.managers.length === 0 ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <div className="space-y-1">
                        {[...c.managers].sort((a, b) => (a.role === "director" ? -1 : 1) - (b.role === "director" ? -1 : 1)).map(m => (
                          <div key={m.id} className="flex items-center gap-1.5 text-xs">
                            <Badge
                              variant={m.role === "director" ? "default" : "outline"}
                              className="text-[9px] px-1 py-0 leading-4 capitalize shrink-0"
                            >
                              {m.role}
                            </Badge>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground">{m.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.technicians.length}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <CopyLinkButton companyId={c.id} />
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)}>
                        <PencilIcon />
                      </Button>
                      <DeleteButton companyId={c.id} name={c.name} />
                      <Link
                        href={`/dashboard/companies/${c.id}`}
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      >
                        <ArrowRightIcon />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add company" : `Edit ${(editing as CompanyWithRelations)?.name}`}</DialogTitle>
          </DialogHeader>
          {editing && (
            <CompanyForm
              company={editing === "new" ? undefined : editing}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
