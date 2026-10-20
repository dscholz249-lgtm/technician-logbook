"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail } from "@/lib/supabase/db";
import { deleteLogbookEntry } from "@/lib/api";
import { isAdmin } from "@/lib/env";

/**
 * Soft-delete one logbook entry (PRD-434). Directors may delete any entry in
 * their company; managers only entries they wrote. The scope is derived from
 * the caller, never the client — companyId is used only for admins, who reach
 * these pages while impersonating and act on the company being viewed.
 */
export async function deleteLogEntryAsManager(
  entryId: number,
  companyId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated." };
  if (!Number.isInteger(entryId)) return { error: "Log not found." };

  let scope: { company_id: string; manager_phone?: string | null; deleted_by: string };
  const manager = await getManagerByEmail(user.email).catch(() => null);
  if (manager) {
    if (manager.role === "director") {
      scope = { company_id: manager.company_id, deleted_by: user.email };
    } else {
      // A manager with no phone on file has written no entries to delete.
      if (!manager.phone) return { error: "You can only delete logs you wrote." };
      scope = { company_id: manager.company_id, manager_phone: manager.phone, deleted_by: user.email };
    }
  } else if (isAdmin(user.email) && companyId) {
    scope = { company_id: companyId, deleted_by: user.email };
  } else {
    return { error: "Not authorized." };
  }

  try {
    await deleteLogbookEntry(entryId, scope);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return { error: manager?.role === "manager" ? "You can only delete logs you wrote." : "Log not found." };
    }
    return { error: err instanceof Error ? err.message : "Unknown error." };
  }

  revalidatePath("/manager", "layout");
  return {};
}
