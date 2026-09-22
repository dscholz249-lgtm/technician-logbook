"use server";

import { getCompanyById, getCompanies, getManagerByEmail, getTechnicianByEmail, addTechnician } from "@/lib/supabase/db";
import { syncCompanyToExpress } from "@/lib/sync";

export async function joinCompanyAsTechnician(
  companyId: string,
  data: { name: string; email: string; phone: string; title: string },
): Promise<{ error?: string }> {
  const company = await getCompanyById(companyId).catch(() => null);
  if (!company) return { error: "This sign-up link is no longer valid." };

  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim() || null;
  const title = data.title.trim() || null;

  if (!name || !email) return { error: "Name and email are required." };

  // An email can only belong to one person across both tables — sign-in looks the
  // address up in managers first, so a duplicate here would strand the technician.
  const existingManager = await getManagerByEmail(email).catch(() => null);
  if (existingManager) {
    return { error: "That email is already registered as a manager. Contact your admin if you need help." };
  }
  const existingTech = await getTechnicianByEmail(email).catch(() => null);
  if (existingTech) {
    return { error: "That email is already registered. Contact your admin if you need help." };
  }

  try {
    await addTechnician(companyId, { name, email, phone, title });
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

  // Sync in background so the SMS bot recognises the new technician's phone.
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
