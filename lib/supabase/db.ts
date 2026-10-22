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
  email: string | null;
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

export interface InterestRequest {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  team_size: string | null;
  status: "pending" | "contacted" | "created";
  created_at: string;
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

// Reporting to the Labs Console happens here rather than in the actions
// layer because every path — the /join form, the dashboard, the CSV import —
// converges on these functions. The Console treats a re-send for an existing
// external_user_id as an update, not a second membership, so emitting on every
// write is safe and means no path can silently skip reporting.
import { labsEventDetached, technicianExternalId } from "@/lib/labs-console";

// ----------------------------------------------------------------- managers
export async function upsertManager(
  companyId: string,
  data: { name: string; email: string | null; phone?: string | null; role?: ManagerRole },
  managerId?: string,
): Promise<Manager> {
  const db = createAdminClient();
  if (managerId) {
    const { data: row, error } = await db
      .from("managers")
      .update({ company_id: companyId, ...data, updated_at: new Date().toISOString() })
      .eq("id", managerId)
      .select()
      .single();
    if (error) throw error;
    reportManager(row);
    return row;
  }
  const { data: row, error } = await db
    .from("managers")
    .insert({ company_id: companyId, ...data })
    .select()
    .single();
  if (error) throw error;
  reportManager(row);
  return row;
}

/** A manager gaining access — for the Logbook that is finishing /join or being
 *  added from the dashboard. The manager's own id is stable, so it is the
 *  external_user_id directly. */
function reportManager(row: Manager): void {
  labsEventDetached("user.registered", {
    external_user_id: row.id,
    email: row.email,
    phone: row.phone,
    name: row.name,
    role: row.role ?? "manager",
  });
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

/** The active manager/director texting from this phone (digits compared, since
 *  stored formats vary), or null. Used by the SMS add-technician flow. */
export async function getManagerByPhone(phone: string): Promise<Manager | null> {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  const db = createAdminClient();
  const { data, error } = await db
    .from("managers")
    .select("*")
    .not("phone", "is", null)
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []).find(m => phoneDigits(m.phone) === digits) ?? null;
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
  labsEventDetached("user.removed", {
    external_user_id: managerId,
    reason: "deleted",
  });
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

  // Read before the delete so the Console gets a diff rather than a
  // remove-everything-then-add-everything churn on every roster save. The
  // rows are hard-deleted with no deleted_at, so this is the only moment a
  // removal is observable at all.
  const { data: before } = await db
    .from("technicians")
    .select("*")
    .eq("company_id", companyId);

  await db.from("technicians").delete().eq("company_id", companyId);

  let inserted: Technician[] = [];
  if (rows.length > 0) {
    const { data, error } = await db
      .from("technicians")
      .insert(rows.map(r => ({ company_id: companyId, ...r })))
      .select();
    if (error) throw error;
    inserted = data ?? [];
  }

  reportTechnicianDiff(companyId, before ?? [], inserted);
}

/**
 * Emits registrations for technicians now on the roster and removals for those
 * no longer on it, keyed on a derived stable id (see technicianExternalId).
 *
 * A technician "registers" by being added to the roster — they never log in,
 * and the event is about access, not authentication.
 */
function reportTechnicianDiff(
  companyId: string,
  before: Technician[],
  after: Technician[],
): void {
  const idOf = (t: { email?: string | null; phone?: string | null; name?: string | null }) =>
    technicianExternalId(companyId, t);

  const afterIds = new Set(after.map(idOf));

  for (const t of after) {
    labsEventDetached("user.registered", {
      external_user_id: idOf(t),
      email: t.email,
      phone: t.phone,
      name: t.name,
      role: "technician",
    });
  }

  for (const t of before) {
    if (afterIds.has(idOf(t))) continue;
    labsEventDetached("user.removed", {
      external_user_id: idOf(t),
      reason: "deleted",
    });
  }
}

export async function getTechnicianByEmail(email: string): Promise<Technician | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("technicians")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTechnicianPhone(technicianId: string, phone: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("technicians")
    .update({ phone })
    .eq("id", technicianId);
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

export async function getTechnicianById(id: string): Promise<Technician | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("technicians").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTechnician(
  id: string,
  row: { name?: string; email?: string | null; title?: string | null; phone?: string | null; company_id?: string },
): Promise<void> {
  const db = createAdminClient();
  const before = await getTechnicianById(id);
  const { data: after, error } = await db
    .from("technicians")
    .update(row)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!after) return;

  // The Console id is derived from email/phone/name (technicianExternalId), so
  // an edit to those — or a company move — reads as a different person: retire
  // the old id, then register the new one (a re-send for an unchanged id is an
  // update, so this is safe on every edit).
  const afterId = technicianExternalId(after.company_id, after);
  if (before) {
    const beforeId = technicianExternalId(before.company_id, before);
    if (beforeId !== afterId) {
      labsEventDetached("user.removed", { external_user_id: beforeId, reason: "deleted" });
    }
  }
  labsEventDetached("user.registered", {
    external_user_id: afterId,
    email: after.email,
    phone: after.phone,
    name: after.name,
    role: "technician",
  });
}

export async function deleteTechnician(id: string): Promise<void> {
  const db = createAdminClient();
  const before = await getTechnicianById(id);
  const { error } = await db.from("technicians").delete().eq("id", id);
  if (error) throw error;
  if (before) {
    labsEventDetached("user.removed", {
      external_user_id: technicianExternalId(before.company_id, before),
      reason: "deleted",
    });
  }
}

/**
 * Who else already uses this email or phone. Email is the sign-in key (the
 * magic-link lookup checks managers then technicians) and phone is how the SMS
 * service recognises an inbound text, so either one shared between two people
 * would route a login or a message to the wrong person. Phones compare on
 * digits only, since stored formats vary.
 */
export async function findContactConflict(
  contact: { email: string | null; phone: string | null },
  excludeTechnicianId?: string,
): Promise<"email" | "phone" | null> {
  const db = createAdminClient();
  // No exclusion for a brand-new technician (neq on "" would be a bad uuid).
  const isOther = (id: string) => id !== excludeTechnicianId;
  if (contact.email) {
    const email = contact.email.toLowerCase();
    const [{ data: techs }, { data: mgrs }] = await Promise.all([
      // Emails are stored lowercased by every write path; eq, not ilike, so an
      // "_" in an address isn't read as a wildcard.
      db.from("technicians").select("id").eq("email", email),
      db.from("managers").select("id").eq("email", email).is("deleted_at", null).limit(1),
    ]);
    if ((techs ?? []).some(t => isOther(t.id)) || (mgrs?.length ?? 0) > 0) return "email";
  }
  const digits = phoneDigits(contact.phone);
  if (digits) {
    const [{ data: techs }, { data: mgrs }] = await Promise.all([
      db.from("technicians").select("id, phone").not("phone", "is", null),
      db.from("managers").select("id, phone").not("phone", "is", null).is("deleted_at", null),
    ]);
    const clash = [...(techs ?? []).filter(t => isOther(t.id)), ...(mgrs ?? [])]
      .some(r => phoneDigits(r.phone) === digits);
    if (clash) return "phone";
  }
  return null;
}

// Last 10 digits, so "+1 (555) 000-0000" and "5550000000" compare equal —
// the same normalisation the SMS service applies (US numbers only).
function phoneDigits(phone: string | null | undefined): string | null {
  const d = phone?.replace(/\D/g, "") ?? "";
  if (!d) return null;
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
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
  labsEventDetached("user.registered", {
    external_user_id: technicianExternalId(companyId, data),
    email: data.email,
    phone: data.phone,
    name: data.name,
    role: "technician",
  });
  return data;
}

// ----------------------------------------------------------------- interest_requests
export async function createInterestRequest(req: {
  name: string;
  email: string;
  company_name?: string;
  team_size?: string;
}): Promise<InterestRequest> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("interest_requests")
    .insert(req)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getInterestRequests(): Promise<InterestRequest[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("interest_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateInterestRequestStatus(
  id: string,
  status: InterestRequest["status"],
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("interest_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
