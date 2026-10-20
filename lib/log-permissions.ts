import type { Manager } from "@/lib/supabase/db";
import type { LogbookEntry } from "@/lib/types";

// Who may delete a log (PRD-434): a director, any entry in their company; a
// manager, only entries they wrote (manager_phone is the author's phone, and
// technician-texted entries carry an empty one). Used to decide which delete
// buttons to render — the server action re-checks, and the SMS service
// enforces the same scope it's handed.
export function canDeleteLog(
  manager: Pick<Manager, "role" | "phone" | "company_id">,
  entry: Pick<LogbookEntry, "manager_phone" | "company_id">,
): boolean {
  if (entry.company_id !== manager.company_id) return false;
  if (manager.role === "director") return true;
  const mine = phoneDigits(manager.phone);
  return !!mine && phoneDigits(entry.manager_phone) === mine;
}

// Last 10 digits — the SMS service stores E.164, managers.phone is as typed.
export function phoneDigits(phone: string | null | undefined): string | null {
  const d = phone?.replace(/\D/g, "") ?? "";
  if (!d) return null;
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}
