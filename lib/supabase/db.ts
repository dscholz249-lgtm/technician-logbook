import "server-only";
import { createAdminClient } from "./admin";

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  created_at: string;
  updated_at: string;
}

export type ReminderPreference = "never" | "daily" | "weekly";
export type ManagerRole = "manager" | "director";

export interface Manager {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: ManagerRole;
  reminder_preference: ReminderPreference;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UrgentRequest {
  id: string;
  company_id: string;
  manager_id: string;
  manager_name: string;
  manager_email: string;
  company_name: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at: string | null;
}

export interface Technician {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  title: string | null;
  phone: string | null;
  created_at: string;
}

export interface CompanyWithRelations extends Company {
  managers: Manager[];
  technicians: Technician[];
}

// ----------------------------------------------------------------- companies
export async function getCompanyById(id: string): Promise<Company | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCompanies(): Promise<CompanyWithRelations[]> {
  const db = createAdminClient();
  const { data: companies, error } = await db.from("companies").select("*").order("name");
  if (error) throw error;

  const { data: managers } = await db.from("managers").select("*").is("deleted_at", null);
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
  extra?: { industry?: string | null; size?: string | null },
): Promise<Company> {
  const db = createAdminClient();
  if (companyId) {
    const { data, error } = await db
      .from("companies")
      .update({ name, industry: extra?.industry ?? null, size: extra?.size ?? null, updated_at: new Date().toISOString() })
      .eq("id", companyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await db
    .from("companies")
    .insert({ name, industry: extra?.industry ?? null, size: extra?.size ?? null })
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
  data: { name: string; email: string; phone?: string | null; role?: ManagerRole },
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
    .is("deleted_at", null)
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

export async function softDeleteManager(managerId: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("managers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", managerId);
  if (error) throw error;
}

export async function updateManagerReminderPreference(
  managerId: string,
  preference: ReminderPreference,
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("managers")
    .update({ reminder_preference: preference, updated_at: new Date().toISOString() })
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

// ----------------------------------------------------------------- urgent_requests
export async function getUrgentRequests(): Promise<UrgentRequest[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("urgent_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createUrgentRequest(req: {
  company_id: string;
  manager_id: string;
  manager_name: string;
  manager_email: string;
  company_name: string;
  message: string;
}): Promise<UrgentRequest> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("urgent_requests")
    .insert(req)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function resolveUrgentRequest(id: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("urgent_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateTechnician(
  id: string,
  row: { name?: string; email?: string | null; title?: string | null; phone?: string | null },
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("technicians").update(row).eq("id", id);
  if (error) throw error;
}

export async function addTechnician(
  companyId: string,
  row: { name: string; email?: string | null; title?: string | null; phone?: string | null },
): Promise<Technician> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("technicians")
    .insert({ company_id: companyId, ...row })
    .select()
    .single();
  if (error) throw error;
  return data;
}
