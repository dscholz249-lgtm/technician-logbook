import "server-only";
import { createAdminClient } from "./admin";

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Manager {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  title: string | null;
  created_at: string;
}

export interface CompanyWithRelations extends Company {
  managers: Manager[];
  technicians: Technician[];
}

// ----------------------------------------------------------------- companies
export async function getCompanies(): Promise<CompanyWithRelations[]> {
  const db = createAdminClient();
  const { data: companies, error } = await db.from("companies").select("*").order("name");
  if (error) throw error;

  const { data: managers } = await db.from("managers").select("*");
  const { data: technicians } = await db.from("technicians").select("*");

  return (companies ?? []).map(c => ({
    ...c,
    managers: (managers ?? []).filter(m => m.company_id === c.id),
    technicians: (technicians ?? []).filter(t => t.company_id === c.id),
  }));
}

export async function upsertCompany(
  name: string,
  companyId?: string,
): Promise<Company> {
  const db = createAdminClient();
  if (companyId) {
    const { data, error } = await db
      .from("companies")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", companyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await db
    .from("companies")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("companies").delete().eq("id", id);
  if (error) throw error;
}

// ----------------------------------------------------------------- managers
export async function upsertManager(
  companyId: string,
  data: { name: string; email: string; phone?: string | null },
  managerId?: string,
): Promise<Manager> {
  const db = createAdminClient();
  if (managerId) {
    const { data: row, error } = await db
      .from("managers")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", managerId)
      .select()
      .single();
    if (error) throw error;
    return row;
  }
  const { data: row, error } = await db
    .from("managers")
    .insert({ company_id: companyId, ...data })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function getManagerByEmail(email: string): Promise<Manager | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("managers")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateManagerPhone(
  managerId: string,
  phone: string,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("managers")
    .update({ phone, updated_at: new Date().toISOString() })
    .eq("id", managerId);
  if (error) throw error;
}

// ----------------------------------------------------------------- technicians
export async function replaceTechnicians(
  companyId: string,
  rows: { name: string; email?: string | null; title?: string | null }[],
): Promise<void> {
  const db = createAdminClient();
  await db.from("technicians").delete().eq("company_id", companyId);
  if (rows.length === 0) return;
  const { error } = await db
    .from("technicians")
    .insert(rows.map(r => ({ company_id: companyId, ...r })));
  if (error) throw error;
}
