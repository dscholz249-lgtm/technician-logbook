"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquareOffIcon } from "lucide-react";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

/**
 * Shown while the signed-in user's phone is opted out of SMS. Dismissible so it
 * doesn't trap someone who meant to opt out, but it is not remembered beyond
 * the browser session — it comes back at the next sign-in and keeps coming back
 * until they text START, which clears the opt-out server-side.
 */
export function OptOutModal({ smsNumber, phone }: { smsNumber: string; phone: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // sessionStorage can throw in private browsing; a missing suppression flag
    // just means the modal shows, which is the safe direction to fail.
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(`skillcat_optout_dismissed:${phone}`) === "1";
    } catch {}
    if (!dismissed) setOpen(true);
  }, [phone]);

  function dismiss() {
    try {
      sessionStorage.setItem(`skillcat_optout_dismissed:${phone}`, "1");
    } catch {}
    setOpen(false);
  }

  const smsE164 = toE164(smsNumber);
  const startHref = `sms:${smsE164}?&body=START`;

  return (
    <Dialog open={open} onOpenChange={o => !o && dismiss()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-8 rounded-full bg-skillcat-orange/10 flex items-center justify-center shrink-0">
              <MessageSquareOffIcon className="size-4 text-skillcat-orange" />
            </div>
            <DialogTitle>Text messages are paused</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            You replied STOP, so SkillCat can no longer text you. While texts are off
            you won&apos;t get course recommendations, and you can&apos;t log notes or
            send job site photos by text.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To turn them back on, text <span className="font-medium text-foreground">START</span> to{" "}
            <span className="font-mono font-medium text-foreground">{smsNumber}</span>.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <Button render={<a href={startHref} />} className="w-full">
            Text START to turn texts back on
          </Button>
          <Button variant="ghost" onClick={dismiss} className="w-full">
            Not now
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Your dashboard keeps working either way — this only affects text messages.
        </p>
      </DialogContent>
    </Dialog>
  );
}
