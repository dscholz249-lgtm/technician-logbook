"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneIcon } from "lucide-react";

export function PhoneRequiredModal({
  currentPhone,
  smsNumber,
  action,
}: {
  currentPhone: string | null;
  smsNumber: string;
  action: (fd: FormData) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(currentPhone === null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phone number saved.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-8 rounded-full bg-skillcat-orange/10 flex items-center justify-center shrink-0">
              <PhoneIcon className="size-4 text-skillcat-orange" />
            </div>
            <DialogTitle>Add your phone number</DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Your phone number is how SkillCat knows who you are when you text{" "}
          <span className="font-mono font-medium text-foreground">{smsNumber}</span>.
          Without it, messages you send won&apos;t be linked to your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label htmlFor="modal-phone">Phone number</Label>
            <Input
              id="modal-phone"
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              autoFocus
              required
            />
            <p className="text-[11px] text-muted-foreground">Include country code, e.g. +1 for US numbers.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving…" : "Save phone number"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground text-xs"
              onClick={() => setOpen(false)}
            >
              Skip for now
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
