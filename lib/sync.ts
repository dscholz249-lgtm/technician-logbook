import "server-only";
import { env } from "./env";
import type { Manager, Technician } from "./supabase/db";

// Pushes current company managers + technicians to the Express snapshot store
// so the SMS handler can look up employees by name and map manager phones to company_id.
export async function syncCompanyToExpress(
  companyId: string,
  companyName: string,
  managers: Manager[],
  technicians: Technician[],
): Promise<void> {
  const employees = [
    ...managers.map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone ?? null,
      email: m.email,
      title: "Manager",
      company_id: companyId,
      company_name: companyName,
    })),
    ...technicians.map(t => ({
      id: t.id,
      name: t.name,
      phone: t.phone ?? null,
      email: t.email ?? null,
      title: t.title ?? null,
      company_id: companyId,
      company_name: companyName,
    })),
  ];

  const url = `${env.EXPRESS_API_URL}/api/snapshot/ingest`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.EXPRESS_API_SECRET}`,
    },
    // company_ids tells the SMS service this is the company's full roster, so
    // it drops anyone no longer on it (removed, or re-created under a new id).
    // Withheld for an empty roster: several callers fall back to `?? []` when
    // the company lookup misses, and that must not wipe the company.
    body: JSON.stringify(
      employees.length > 0 ? { employees, company_ids: [companyId] } : { employees },
    ),
    cache: "no-store",
  });
}
