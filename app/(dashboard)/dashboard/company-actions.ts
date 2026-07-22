"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  upsertCompany, upsertManager, replaceTechnicians, addTechnician,
  updateTechnician as dbUpdateTechnician, deleteTechnician,
  deleteCompany, getCompanies, softDeleteManager,
} from "@/lib/supabase/db";

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Unknown error";
}
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

// Parses "name, email, phone" rows for directors/managers (one per line)
function parsePersonCsv(raw: string): { name: string; email: string; phone: string | null }[] {
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.toLowerCase().startsWith("name"))
    .map(line => {
      const [name, email, phone] = line.split(",").map(f => f.trim());
      return { name: name || "", email: (email || "").toLowerCase(), phone: phone || null };
    })
    .filter(r => r.name && r.email);
}

// Strips surrounding quotes from a CSV field (handles Excel/Sheets exports)
function unquote(s: string): string {
  return s.trim().replace(/^["']|["']$/g, "");
}

// Parses "role, name, email[, phone_or_title]" rows for the combined CSV import mode.
// Handles 3-column (role, name, email) and 4-column variants, with or without quotes.
function parseAllPeopleCsv(raw: string): {
  role: "director" | "manager" | "technician";
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
}[] {
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      const firstCol = unquote(line.split(",")[0] ?? "").toLowerCase();
      // Skip header rows
      return firstCol !== "role" && firstCol !== "type";
    })
    .map(line => {
      const parts = line.split(",").map(unquote);
      const [role, name, email, extra] = parts;
      const r = role?.toLowerCase();
      if (r !== "director" && r !== "manager" && r !== "technician") return null;
      if (!name || !email) return null;
      return {
        role: r as "director" | "manager" | "technician",
        name,
        email: email.toLowerCase(),
        phone: r !== "technician" ? (extra || null) : null,
        title: r === "technician" ? (extra || null) : null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

export async function saveCompany(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const companyId = formData.get("company_id") as string | null;
  const isEdit = !!companyId;
  const companyName = (formData.get("company_name") as string)?.trim();
  const industry = (formData.get("industry") as string)?.trim() || null;
  const size = (formData.get("size") as string)?.trim() || null;

  if (!companyName) return { error: "Company name is required." };

  // Pre-parse and validate staffing before touching the DB
  type PersonRow = { name: string; email: string; phone: string | null };
  let createDirectors: PersonRow[] = [];
  let createManagers: PersonRow[] = [];
  let createTechs: { name: string; email: string | null; title: string | null }[] = [];

  if (!isEdit) {
    const createMode = (formData.get("create_mode") as string) || "manual";
    if (createMode === "csv") {
      const people = parseAllPeopleCsv((formData.get("people_csv") as string) || "");
      createDirectors = people.filter(p => p.role === "director").map(p => ({ name: p.name, email: p.email, phone: p.phone }));
      createManagers = people.filter(p => p.role === "manager").map(p => ({ name: p.name, email: p.email, phone: p.phone }));
      createTechs = people.filter(p => p.role === "technician").map(p => ({ name: p.name, email: p.email, title: p.title }));
    } else {
      createDirectors = parsePersonCsv((formData.get("directors_csv") as string) || "");
      createManagers = parsePersonCsv((formData.get("managers_csv") as string) || "");
      createTechs = parseCsv((formData.get("technicians_csv") as string) || "");
    }
    if (createDirectors.length === 0 && createManagers.length === 0) {
      return { error: "At least one director or manager is required." };
    }
  }

  try {
    const company = await upsertCompany(companyName, companyId || undefined, { industry, size });

    if (!isEdit) {
      for (const d of createDirectors) {
        await upsertManager(company.id, { name: d.name, email: d.email, phone: d.phone, role: "director" });
      }
      for (const m of createManagers) {
        await upsertManager(company.id, { name: m.name, email: m.email, phone: m.phone, role: "manager" });
      }
      await replaceTechnicians(company.id, createTechs);
    } else {
      const technicians = parseCsv((formData.get("technicians_csv") as string) || "");
      await replaceTechnicians(company.id, technicians);
    }

    // Re-fetch to get all current managers for sync
    const companies = await getCompanies();
    const companyData = companies.find(c => c.id === company.id);
    await syncCompanyToExpress(company.id, companyData?.name ?? companyName, companyData?.managers ?? [], companyData?.technicians ?? []);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: errMsg(err) };
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
    await syncCompanyToExpress(companyId, companyData?.name ?? "", companyData?.managers ?? [], companyData?.technicians ?? []);
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: errMsg(err) };
  }
}

export async function removeManager(managerId: string, companyId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await softDeleteManager(managerId);
    const companies = await getCompanies();
    const companyData = companies.find(c => c.id === companyId);
    await syncCompanyToExpress(companyId, companyData?.name ?? "", companyData?.managers ?? [], companyData?.technicians ?? []);
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: errMsg(err) };
  }
}

export async function syncAllCompanies(): Promise<{ error?: string; synced?: number }> {
  await requireAdmin();
  try {
    const companies = await getCompanies();
    await Promise.all(companies.map(c => syncCompanyToExpress(c.id, c.name, c.managers, c.technicians)));
    revalidatePath("/dashboard");
    return { synced: companies.length };
  } catch (err) {
    return { error: errMsg(err) };
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
    return { error: errMsg(err) };
  }
}

export async function addTechnicianToCompany(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const companyId = formData.get("company_id") as string;
  const name = (formData.get("technician_name") as string)?.trim();
  const email = (formData.get("technician_email") as string)?.trim() || null;
  const title = (formData.get("technician_title") as string)?.trim() || null;
  const phone = (formData.get("technician_phone") as string)?.trim() || null;
  if (!companyId || !name) return { error: "Technician name is required." };
  try {
    await addTechnician(companyId, { name, email, title, phone });
    revalidatePath(`/dashboard/companies/${companyId}`);
    return {};
  } catch (err) {
    return { error: errMsg(err) };
  }
}

export async function updateUser(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const managerId = formData.get("manager_id") as string;
  const companyId = formData.get("company_id") as string;
  const name = (formData.get("manager_name") as string)?.trim();
  const email = (formData.get("manager_email") as string)?.trim().toLowerCase();
  const phone = (formData.get("manager_phone") as string)?.trim() || null;
  const roleRaw = (formData.get("manager_role") as string) || "manager";
  const role = roleRaw === "director" ? "director" as const : "manager" as const;

  if (!managerId || !name || !email) {
    return { error: "Name and email are required." };
  }

  try {
    await upsertManager(companyId, { name, email, phone, role }, managerId);
    const companies = await getCompanies();
    const companyData = companies.find(c => c.id === companyId);
    await syncCompanyToExpress(companyId, companyData?.name ?? "", companyData?.managers ?? [], companyData?.technicians ?? []);
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: errMsg(err) };
  }
}

export async function updateTechnician(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const technicianId = formData.get("technician_id") as string;
  const companyId = formData.get("company_id") as string;
  const name = (formData.get("technician_name") as string)?.trim();
  const email = (formData.get("technician_email") as string)?.trim().toLowerCase() || null;
  const phone = (formData.get("technician_phone") as string)?.trim() || null;
  const title = (formData.get("technician_title") as string)?.trim() || null;

  if (!technicianId || !name) return { error: "Name is required." };

  try {
    await dbUpdateTechnician(technicianId, { name, email, phone, title });
    const companies = await getCompanies();
    const companyData = companies.find(c => c.id === companyId);
    await syncCompanyToExpress(companyId, companyData?.name ?? "", companyData?.managers ?? [], companyData?.technicians ?? []);
    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: errMsg(err) };
  }
}

export async function removeCompany(companyId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await deleteCompany(companyId);
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return { error: errMsg(err) };
  }
}

// Unified admin edit — handles all fields and cross-table role moves.
export async function adminUpdateUser(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();

  const kind = formData.get("kind") as "manager" | "technician";
  const userId = formData.get("user_id") as string;
  const oldCompanyId = (formData.get("old_company_id") as string)?.trim();
  const companyId = (formData.get("company_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const roleRaw = (formData.get("role") as string) || "manager";
  const title = (formData.get("title") as string)?.trim() || null;

  if (!userId || !companyId || !name || !email) {
    return { error: "Name, email, and company are required." };
  }

  const newRole = roleRaw as "director" | "manager" | "technician";

  try {
    if (kind === "manager" && newRole !== "technician") {
      // Manager/Director → Manager/Director: update in place (company_id now included in upsert)
      await upsertManager(companyId, { name, email, phone, role: newRole }, userId);
    } else if (kind === "technician" && newRole === "technician") {
      // Technician → Technician: update all fields including company
      await dbUpdateTechnician(userId, { name, email, phone, title, company_id: companyId });
    } else if (kind === "technician" && newRole !== "technician") {
      // Technician → Manager/Director: create manager, delete technician
      await upsertManager(companyId, { name, email, phone, role: newRole as "manager" | "director" });
      await deleteTechnician(userId);
    } else {
      // Manager/Director → Technician: create technician, soft-delete manager
      await addTechnician(companyId, { name, email, phone, title });
      await softDeleteManager(userId);
    }

    // Sync all affected companies (old + new, deduped)
    const companyIds = [...new Set([oldCompanyId, companyId].filter(Boolean))];
    const companies = await getCompanies();
    await Promise.all(
      companyIds.map(id => {
        const c = companies.find(co => co.id === id);
        return c ? syncCompanyToExpress(c.id, c.name, c.managers, c.technicians) : Promise.resolve();
      }),
    );

    revalidatePath("/dashboard/companies");
    revalidatePath("/dashboard/managers");
    return {};
  } catch (err) {
    return { error: errMsg(err) };
  }
}
