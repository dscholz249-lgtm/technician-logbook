"use server";

import { revalidatePath } from "next/cache";
import {
  upsertCompany, upsertManager, replaceTechnicians,
  deleteCompany, getCompanies,
} from "@/lib/supabase/db";
import { syncCompanyToExpress } from "@/lib/sync";

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
  const companyId = formData.get("company_id") as string | null;
  const companyName = (formData.get("company_name") as string)?.trim();
  const managerId = formData.get("manager_id") as string | null;
  const managerName = (formData.get("manager_name") as string)?.trim();
  const managerEmail = (formData.get("manager_email") as string)?.trim().toLowerCase();
  const managerPhone = (formData.get("manager_phone") as string)?.trim() || null;
  const techniciansCsv = (formData.get("technicians_csv") as string) || "";

  if (!companyName || !managerName || !managerEmail) {
    return { error: "Company name, manager name, and manager email are required." };
  }

  try {
    const company = await upsertCompany(companyName, companyId || undefined);

    const manager = await upsertManager(
      company.id,
      { name: managerName, email: managerEmail, phone: managerPhone },
      managerId || undefined,
    );

    const technicians = parseCsv(techniciansCsv);
    await replaceTechnicians(company.id, technicians);

    // Sync to Express so SMS handler has up-to-date employee data
    const { data: techRows } = await fetchTechsForSync(company.id, technicians, manager);
    await syncCompanyToExpress(company.id, [manager], techRows);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { error: msg };
  }
}

async function fetchTechsForSync(
  companyId: string,
  techRows: { name: string; email: string | null; title: string | null }[],
  manager: Awaited<ReturnType<typeof upsertManager>>,
) {
  // Build synthetic technician objects for the sync (they won't have IDs from Supabase
  // since we just replaced them — re-fetch from Supabase)
  const companies = await getCompanies();
  const company = companies.find(c => c.id === companyId);
  return { data: company?.technicians ?? [] };
}

export async function removeCompany(companyId: string): Promise<{ error?: string }> {
  try {
    await deleteCompany(companyId);
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
