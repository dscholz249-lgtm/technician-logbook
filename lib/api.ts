import "server-only";
import { env } from "./env";
import type { QueueItem, LogbookEntry } from "./types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.EXPRESS_API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
): Promise<QueueItem[]> {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<QueueItem[]>(`/api/queue${qs}`);
}

export async function getLogbook(): Promise<LogbookEntry[]> {
  return apiFetch<LogbookEntry[]>("/api/logbook");
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
