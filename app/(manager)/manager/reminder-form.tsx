"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { saveReminderPreference } from "./actions";
import type { ReminderPreference } from "@/lib/supabase/db";

const OPTIONS: { value: ReminderPreference; label: string; sub: string }[] = [
  { value: "never",  label: "Never",   sub: "No reminders" },
  { value: "daily",  label: "Daily",   sub: "Weekdays at 5 pm" },
  { value: "weekly", label: "Fridays", sub: "Weekly at 5 pm" },
];

export function ReminderForm({ current }: { current: ReminderPreference }) {
  const [pending, startTransition] = useTransition();

  function select(value: ReminderPreference) {
    if (value === current || pending) return;
    startTransition(async () => {
      const result = await saveReminderPreference(value);
      if (result.error) toast.error(result.error);
      else toast.success("Reminder preference saved.");
    });
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Check-in reminders</p>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => {
          const active = opt.value === current;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              disabled={pending}
              className={[
                "rounded-lg border px-3 py-2 text-left transition-colors",
                active
                  ? "border-skillcat-orange bg-skillcat-orange/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                pending ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              <p className="text-xs font-medium leading-none">{opt.label}</p>
              <p className="text-[10px] mt-0.5 leading-none">{opt.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
