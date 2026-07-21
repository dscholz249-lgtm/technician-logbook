"use client";

import { useState, useTransition } from "react";
import { submitInterestRequest } from "./actions";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function InterestForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitInterestRequest(fd);
      if (result.error) setError(result.error);
      else setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="text-center space-y-3 py-6">
        <div className="size-12 mx-auto rounded-full bg-skillcat-orange/10 flex items-center justify-center">
          <svg className="size-6 text-skillcat-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold text-foreground">Thanks for your interest!</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Someone from the SkillCat team will reach out when your account is ready.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="ir_name" className="text-xs font-medium text-foreground">
            Your name
          </label>
          <input id="ir_name" name="name" required className={inputClass} placeholder="Jane Smith" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ir_email" className="text-xs font-medium text-foreground">
            Work email
          </label>
          <input id="ir_email" name="email" type="email" required className={inputClass} placeholder="jane@company.com" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="ir_company" className="text-xs font-medium text-foreground">
            Company name
          </label>
          <input id="ir_company" name="company_name" className={inputClass} placeholder="Acme HVAC" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ir_size" className="text-xs font-medium text-foreground">
            Team size
          </label>
          <select id="ir_size" name="team_size" className={inputClass}>
            <option value="">Select size…</option>
            <option value="1-10">1–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="200+">200+</option>
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full h-9 rounded-md bg-skillcat-orange px-4 text-sm font-medium text-white shadow-xs hover:bg-skillcat-orange/90 transition-colors disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Request access"}
      </button>
    </form>
  );
}
