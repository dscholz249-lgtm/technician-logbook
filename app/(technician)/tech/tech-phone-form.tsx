"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveTechPhone } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TechPhoneForm({ currentPhone }: { currentPhone: string | null }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveTechPhone(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phone number saved.");
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Your phone number</p>
          <p className="text-sm font-medium mt-0.5">
            {currentPhone ?? <span className="text-muted-foreground italic">Not set</span>}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          {currentPhone ? "Update" : "Add phone"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="tech-phone">Your phone number</Label>
        <Input
          id="tech-phone"
          name="phone"
          type="tel"
          defaultValue={currentPhone ?? ""}
          placeholder="+1 555 000 0000"
          className="w-52"
          autoFocus
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </form>
  );
}
