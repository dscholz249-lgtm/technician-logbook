"use client";

import { stopImpersonation } from "@/app/(dashboard)/dashboard/managers/impersonate-actions";

export function ImpersonationBanner({ name, role }: { name: string; role: string }) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/25 px-6 py-2 flex items-center justify-between">
      <p className="text-xs text-amber-500">
        Viewing as <span className="font-semibold">{name}</span>
        <span className="ml-1 opacity-70">({role})</span>
      </p>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="text-xs text-amber-500 hover:text-amber-400 transition-colors underline underline-offset-2"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
