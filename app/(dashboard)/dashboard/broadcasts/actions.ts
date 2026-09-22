"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/env";
import { getCompanies } from "@/lib/supabase/db";
import { sendBroadcast, type BroadcastRecipientInput } from "@/lib/api";

const MAX_BODY_LENGTH = 1000;

async function requireRealAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdmin(user.email)) {
    throw new Error("Unauthorized");
  }
  // An admin viewing the app as someone else must not be able to text the
  // entire manager roster from inside that session.
  const jar = await cookies();
  if (jar.get("skillcat_impersonate")) {
    throw new Error("Exit impersonation before sending a broadcast.");
  }
  return user.email;
}

export interface SendBroadcastState {
  error?: string;
  sent?: number;
  excludedOptOut?: number;
}

export async function sendBroadcastAction(input: {
  body: string;
  managerIds: string[];
  filter: { companyIds: string[]; roles: string[]; includeNeverRemind: boolean };
  idempotencyKey: string;
}): Promise<SendBroadcastState> {
  try {
    const sentBy = await requireRealAdmin();

    const body = input.body.trim();
    if (!body) return { error: "Message cannot be empty." };
    if (body.length > MAX_BODY_LENGTH) {
      return { error: `Message is ${body.length} characters — the limit is ${MAX_BODY_LENGTH}.` };
    }
    if (input.managerIds.length === 0) {
      return { error: "Select at least one recipient." };
    }

    // Resolve the selected ids against Supabase rather than trusting phone
    // numbers posted from the browser — the client sends ids only.
    const companies = await getCompanies();
    const selected = new Set(input.managerIds);
    const recipients: BroadcastRecipientInput[] = [];
    for (const company of companies) {
      for (const manager of company.managers) {
        if (!selected.has(manager.id) || !manager.phone) continue;
        recipients.push({
          employee_id: manager.id,
          phone: manager.phone,
          name: manager.name,
          company_id: company.id,
          company_name: company.name,
        });
      }
    }

    if (recipients.length === 0) {
      return { error: "None of the selected users have a phone number." };
    }

    const result = await sendBroadcast({
      body,
      sentBy,
      recipients,
      filter: input.filter,
      idempotencyKey: input.idempotencyKey,
    });

    revalidatePath("/dashboard/broadcasts");
    return { sent: result.queued, excludedOptOut: result.excluded_opt_out };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
