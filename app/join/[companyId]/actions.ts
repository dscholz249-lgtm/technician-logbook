"use server";

import { getCompanyById, getCompanies, upsertManager } from "@/lib/supabase/db";
import { syncCompanyToExpress } from "@/lib/sync";

export async function joinCompany(
  companyId: string,
  data: { name: string; email: string; phone: string },
): Promise<{ error?: string }> {
  const company = await getCompanyById(companyId).catch(() => null);
  if (!company) return { error: "This sign-up link is no longer valid." };

  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim() || null;

  if (!name || !email) return { error: "Name and email are required." };

  try {
    await upsertManager(companyId, { name, email, phone });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message
      : (err && typeof err === "object" && "message" in err) ? String((err as { message: unknown }).message)
      : "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return { error: "That email is already registered. Contact your admin if you need help." };
    }
    return { error: "Something went wrong. Please try again." };
  }

  // Sync in background so the SMS bot recognises the new manager's phone.
  try {
    const companies = await getCompanies();
    const updated = companies.find(c => c.id === companyId);
    if (updated) {
      await syncCompanyToExpress(companyId, company.name, updated.managers, updated.technicians);
    }
  } catch (_) {
    // Non-fatal — admin can manually sync from the dashboard.
  }

  return {};
}
