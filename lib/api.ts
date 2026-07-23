import "server-only";
import { env } from "./env";
import type { QueueItem, LogbookEntry } from "./types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.EXPRESS_API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.EXPRESS_API_SECRET}`,
      ...init?.headers,
    },
    // Don't cache — dashboard data must be fresh on every load.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Express API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getQueue(
  status?: "pending" | "actioned" | "failed",
  companyId?: string,
  managerPhone?: string,
): Promise<QueueItem[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (companyId) params.set("company_id", companyId);
  if (managerPhone) params.set("manager_phone", managerPhone);
  const qs = params.size ? `?${params}` : "";
  return apiFetch<QueueItem[]>(`/api/queue${qs}`);
}

export async function getLogbook(companyId?: string, managerPhone?: string, technicianId?: string): Promise<LogbookEntry[]> {
  const params = new URLSearchParams();
  if (companyId) params.set("company_id", companyId);
  if (managerPhone) params.set("manager_phone", managerPhone);
  if (technicianId) params.set("technician_id", technicianId);
  const qs = params.size ? `?${params}` : "";
  return apiFetch<LogbookEntry[]>(`/api/logbook${qs}`);
}

export interface DayMetric { date: string; inbound: number; outbound: number }
export interface TypeMetric { type: string; total: number; actioned: number }
export interface RetentionData {
  total_managers: number;
  day_2: number | null;
  day_7: number | null;
  day_30: number | null;
}
export interface AnalyticsData {
  messages_by_day: DayMetric[];
  requests_by_type: TypeMetric[];
  totals: {
    inbound_messages: number;
    outbound_messages: number;
    requests_total: number;
    requests_actioned: number;
  };
  dau: number;
  mau: number;
  retention: RetentionData;
}

export interface DauTrendPoint { date: string; unique_users: number }
export interface GlobalRetention {
  total_managers: number;
  day_2: number | null;
  day_7: number | null;
  day_30: number | null;
}
export interface GlobalAnalyticsData {
  dau: number;
  mau: number;
  dau_trend: DauTrendPoint[];
  requests_by_type: TypeMetric[];
  retention: GlobalRetention;
}

export async function getAnalytics(
  companyId: string,
  managerPhones: string[],
): Promise<AnalyticsData> {
  const params = new URLSearchParams({ company_id: companyId });
  const phones = managerPhones.filter(Boolean);
  if (phones.length > 0) params.set("manager_phones", phones.join(","));
  return apiFetch<AnalyticsData>(`/api/analytics?${params}`);
}

export async function getGlobalAnalytics(): Promise<GlobalAnalyticsData> {
  return apiFetch<GlobalAnalyticsData>("/api/analytics/global");
}

// Returns a map of phone → ISO timestamp of last inbound message.
export async function getLastActiveByPhones(
  phones: string[],
): Promise<Record<string, string>> {
  const filtered = phones.filter(Boolean);
  if (filtered.length === 0) return {};
  const params = new URLSearchParams({ phones: filtered.join(",") });
  const rows = await apiFetch<{ phone: string; last_active_at: string }[]>(
    `/api/last-active?${params}`,
  );
  return Object.fromEntries(rows.map(r => [r.phone, r.last_active_at]));
}

export interface TechnicianMedia {
  id: number;
  technician_id: string | null;
  technician_name: string | null;
  technician_phone: string;
  company_id: string | null;
  media_url: string;
  media_content_type: string | null;
  caption: string | null;
  created_at: number;
}

export async function getTechnicianMedia(
  companyId: string,
  technicianId: string,
  technicianPhone?: string | null,
): Promise<TechnicianMedia[]> {
  const params = new URLSearchParams({ company_id: companyId, technician_id: technicianId });
  if (technicianPhone) params.set("technician_phone", technicianPhone);
  return apiFetch<TechnicianMedia[]>(`/api/technician-media?${params}`);
}

export async function markActioned(
  id: number,
  actionedBy: string,
  note?: string,
): Promise<void> {
  await apiFetch<unknown>(`/api/queue/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ actioned_by: actionedBy, note: note ?? "" }),
  });
}
