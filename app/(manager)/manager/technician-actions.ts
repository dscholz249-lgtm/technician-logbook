"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deleteTechnician, findContactConflict, getCompanies, getManagerByEmail,
  getTechnicianById, updateTechnician, type Technician,
} from "@/lib/supabase/db";
import { syncCompanyToExpress } from "@/lib/sync";
import { isAdmin } from "@/lib/env";

/**
 * Any director or manager may edit or remove any technician in their own
 * company (PRD-435). Admins pass too — they reach this page while
 * impersonating, and the dashboard already lets them edit anyone. Scoping is
 * by the technician's stored company_id, never a value from the form.
 */
async function requireTechnicianAccess(technicianId: string): Promise<Technician> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated.");

  const technician = technicianId ? await getTechnicianById(technicianId) : null;
  if (!technician) throw new Error("Technician not found.");

  if (isAdmin(user.email)) return technician;
  const manager = await getManagerByEmail(user.email);
  if (!manager || manager.company_id !== technician.company_id) {
    throw new Error("You can only manage technicians in your own company.");
  }
  return technician;
}

// Push the company roster to the SMS service so texts from a new phone are
// recognised and a removed technician's phone stops matching.
async function resyncCompany(companyId: string): Promise<void> {
  const companies = await getCompanies();
  const c = companies.find(co => co.id === companyId);
  if (c) await syncCompanyToExpress(c.id, c.name, c.managers, c.technicians);
}

function revalidateTechnician(technicianId: string): void {
  revalidatePath("/manager/technicians");
  revalidatePath(`/manager/technician/${technicianId}`);
  revalidatePath("/dashboard/companies");
  revalidatePath("/dashboard/managers");
}

export async function updateTechnicianAsManager(
  formData: FormData,
): Promise<{ error?: string }> {
  const technicianId = (formData.get("technician_id") as string) ?? "";
  let technician: Technician;
  try {
    technician = await requireTechnicianAccess(technicianId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unauthorized." };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const title = (formData.get("title") as string)?.trim() || null;

  if (!name) return { error: "Name is required." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (phone && phone.replace(/\D/g, "").length < 10) {
    return { error: "Enter a 10-digit phone number." };
  }

  try {
    const conflict = await findContactConflict({ email, phone }, technician.id);
    if (conflict === "email") {
      return { error: "That email is already used by another technician or manager." };
    }
    if (conflict === "phone") {
      return { error: "That phone number is already used by another technician or manager." };
    }

    await updateTechnician(technician.id, { name, email, phone, title });
    await resyncCompany(technician.company_id);
    revalidateTechnician(technician.id);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error." };
  }
}

export async function removeTechnicianAsManager(
  technicianId: string,
): Promise<{ error?: string }> {
  let technician: Technician;
  try {
    technician = await requireTechnicianAccess(technicianId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unauthorized." };
  }

  try {
    // Hard delete, same as the admin dashboard — nothing references
    // technicians.id by foreign key. Logbook entries and media already written
    // stay in the SMS service; only the technician's own page goes away.
    await deleteTechnician(technician.id);
    await resyncCompany(technician.company_id);
    revalidateTechnician(technician.id);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error." };
  }
}
