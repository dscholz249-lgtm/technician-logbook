"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  upsertCompany, upsertManager, replaceTechnicians, addTechnician,
  deleteCompany, getCompanies, softDeleteManager,
} from "@/lib/supabase/db";
import { syncCompanyToExpress } from "@/lib/sync";

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !env.ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
}

function parseCsv(raw: string): { name: string; email: string | null; title: string | null }[] {
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.toLowerCase().startsWith("name")) // strip header row
    .map(line => {
      const [name, email, title] = line.split(",").map(f => f.trim());
      return {
        name: name || "",
        email: email || null,
        title: title || null,
      };
    })
    .filter(r => r.name);
}

export async function saveCompany(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const companyId = formData.get("company_id") as string | null;
  const isEdit = !!companyId;
  const companyName = (formData.get("company_name") as string)?.trim();
  const industry = (formData.get("industry") as string)?.trim() || null;
  const size = (formData.get("size") as string)?.trim() || null;
  const techniciansCsv = (formData.get("technicians_csv") as string) || "";

  if (!companyName) return { error: "Company name is required." };

  const managerName = (formData.get("manager_name") as string)?.trim();
  const managerEmail = (formData.get("manager_email") as string)?.trim().toLowerCase();
  const managerPhone = (formData.get("manager_phone") as string)?.trim() || null;

  if (!isEdit && (!managerName || !managerEmail)) {
    return { error: "Manager name and email are required." };
  }

  try {
    const company = await upsertCompany(companyName, companyId || undefined, { industry, size });

    if (!isEdit) {
      await upsertManager(company.id, { name: managerName!, email: managerEmail!, phone: managerPhone });
    }

    const technicians = parseCsv(techniciansCsv);
    await replaceTechnicians(company.id, technicians);

    // Re-fetch to get all current managers (including any added previously on edit)
    const companies = await getCompanies();
    const companyData = companies.find(c => c.id === company.id);
    await syncCompanyToExpress(company.id, companyData?.managers ?? [], companyData?.technicians ?? []);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { error: msg };
  }
}

export async function addManager(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const companyId = formData.get("company_id") as string;
  const name = (formData.get("manager_name") as string)?.trim();
  const email = (formData.get("manager_email") as string)?.trim().toLowerCase();
  const phone = (formData.get("manager_phone") as string)?.trim() || null;
  const roleRaw = (formData.get("manager_role") as string) || "manager";
  const role = roleRaw === "director" ? "director" as const : "manager" as const;

  if (!companyId || !name || !email) {
    return { error: "Name and email are required." };
  }

  try {
    await upsertManager(companyId, { name, email, phone, role });
    const companies = await getCompanies();
    const companyData = companies.find(c => c.id === companyId);
    await syncCompanyToExpress(companyId, companyData?.managers ?? [], companyData?.technicians ?? []);
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function removeManager(managerId: string, companyId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await softDeleteManager(managerId);
    const companies = await getCompanies();
    const companyData = companies.find(c => c.id === companyId);
    await syncCompanyToExpress(companyId, companyData?.managers ?? [], companyData?.technicians ?? []);
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function syncAllCompanies(): Promise<{ error?: string; synced?: number }> {
  await requireAdmin();
  try {
    const companies = await getCompanies();
    await Promise.all(companies.map(c => syncCompanyToExpress(c.id, c.managers, c.technicians)));
    revalidatePath("/dashboard");
    return { synced: companies.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateCompanyInfo(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const companyId = formData.get("company_id") as string;
  const name = (formData.get("company_name") as string)?.trim();
  const industry = (formData.get("industry") as string)?.trim() || null;
  const size = (formData.get("size") as string)?.trim() || null;
  if (!companyId || !name) return { error: "Company name is required." };
  try {
    await upsertCompany(name, companyId, { industry, size });
    revalidatePath(`/dashboard/companies/${companyId}`);
    revalidatePath("/dashboard/companies");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function addTechnicianToCompany(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const companyId = formData.get("company_id") as string;
  const name = (formData.get("technician_name") as string)?.trim();
  const email = (formData.get("technician_email") as string)?.trim() || null;
  const title = (formData.get("technician_title") as string)?.trim() || null;
  if (!companyId || !name) return { error: "Technician name is required." };
  try {
    await addTechnician(companyId, { name, email, title });
    revalidatePath(`/dashboard/companies/${companyId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function removeCompany(companyId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await deleteCompany(companyId);
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
