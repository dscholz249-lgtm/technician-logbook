import { getCompanies } from "@/lib/supabase/db";
import { getConversations } from "@/lib/api";
import { ConversationClient } from "./conversation-client";
import type { MessageLogEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface PhoneMeta {
  phone: string;
  name: string;
  kind: "manager" | "technician";
  companyId: string;
  companyName: string;
}

export default async function ConversationsPage() {
  const companies = await getCompanies().catch(() => []);

  const phoneMeta: PhoneMeta[] = [];
  for (const c of companies) {
    for (const m of c.managers) {
      if (m.phone) {
        phoneMeta.push({
          phone: m.phone,
          name: m.name,
          kind: "manager",
          companyId: c.id,
          companyName: c.name,
        });
      }
    }
    for (const t of c.technicians) {
      if (t.phone) {
        phoneMeta.push({
          phone: t.phone,
          name: t.name,
          kind: "technician",
          companyId: c.id,
          companyName: c.name,
        });
      }
    }
  }

  const allPhones = phoneMeta.map((p) => p.phone);
  const messages = await getConversations(allPhones).catch(() => [] as MessageLogEntry[]);

  const companyNames = [...new Set(companies.map((c) => c.name))].sort();

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Raw SMS logs — all inbound and outbound messages.
        </p>
      </div>
      <ConversationClient
        messages={messages}
        phoneMeta={phoneMeta}
        companyNames={companyNames}
      />
    </div>
  );
}
