"use client";

import { useState, useTransition } from "react";
import { joinCompany } from "./actions";

export function JoinForm({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: (fd.get("name") as string) ?? "",
      email: (fd.get("email") as string) ?? "",
      phone: (fd.get("phone") as string) ?? "",
    };
    setError(null);
    startTransition(async () => {
      const result = await joinCompany(companyId, data);
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-semibold text-foreground">You're in!</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          You've been added to <span className="text-foreground font-medium">{companyName}</span> on
          SkillCat. Look out for a text message with next steps.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-skillcat-orange/50 transition-shadow";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="jf_name" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Full name
        </label>
        <input
          id="jf_name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Jane Smith"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jf_email" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Work email
        </label>
        <input
          id="jf_email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="jane@company.com"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jf_phone" className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Mobile number <span className="text-muted-foreground/60 normal-case font-normal">(for SMS updates)</span>
        </label>
        <input
          id="jf_phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 000 0000"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-skillcat-orange px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60 hover:opacity-90"
      >
        {pending ? "Joining…" : "Join the Pilot"}
      </button>

      <p className="text-center text-xs text-muted-foreground/60">
        Your information is only shared with your company admin.
      </p>
    </form>
  );
}
