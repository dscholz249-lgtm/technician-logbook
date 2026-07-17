"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { emailContactCard } from "./contact-card-action";
import { Button } from "@/components/ui/button";
import { DownloadIcon, MailIcon } from "lucide-react";

export function ContactCardSection() {
  const [pending, startTransition] = useTransition();

  function handleEmail() {
    startTransition(async () => {
      const result = await emailContactCard();
      if (result.error) toast.error(result.error);
      else toast.success("Contact card sent — check your inbox.");
    });
  }

  return (
    <div className="pt-3 border-t border-border space-y-2.5">
      <div>
        <p className="text-xs font-semibold text-foreground">Save to contacts</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add SkillCat to your phone so you always recognise our texts.
        </p>
      </div>
      <div className="flex gap-2">
        <a href="/api/contact-card" download="SkillCat.vcf" className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <DownloadIcon className="size-3.5" /> Download
          </Button>
        </a>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handleEmail}
          disabled={pending}
        >
          <MailIcon className="size-3.5" />
          {pending ? "Sending…" : "Email me"}
        </Button>
      </div>
    </div>
  );
}
