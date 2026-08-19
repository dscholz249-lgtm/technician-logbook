import { confirmPhoneLink, denyPhoneLink, getPhoneLinkDetails } from "@/lib/api";
import {
  getManagerByEmail,
  updateManagerPhone,
  getTechnicianByEmail,
  updateTechnicianPhone,
} from "@/lib/supabase/db";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ token?: string; action?: string }>;
}

async function processAction(token: string, action: string): Promise<"confirmed" | "denied" | "expired" | "invalid"> {
  try {
    if (action === "confirm") {
      // Fetch request details before confirming — confirm deletes the record.
      const request = await getPhoneLinkDetails(token);

      // Update Supabase (source of truth) so roster sync doesn't overwrite the change.
      const manager = await getManagerByEmail(request.email).catch(() => null);
      if (manager) {
        await updateManagerPhone(manager.id, request.phone);
      } else {
        const tech = await getTechnicianByEmail(request.email).catch(() => null);
        if (tech) {
          await updateTechnicianPhone(tech.id, request.phone);
        }
      }

      // Update SQLite via Express and send the confirmation SMS.
      await confirmPhoneLink(token);
      return "confirmed";
    }
    if (action === "deny") {
      await denyPhoneLink(token);
      return "denied";
    }
    return "invalid";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("410") || msg.includes("expired")) return "expired";
    if (msg.includes("404")) return "expired";
    return "invalid";
  }
}

export default async function LinkPhonePage({ searchParams }: Props) {
  const { token, action } = await searchParams;

  if (!token || (action !== "confirm" && action !== "deny")) {
    return <ResultPage state="invalid" />;
  }

  const state = await processAction(token, action);
  return <ResultPage state={state} />;
}

function ResultPage({ state }: { state: "confirmed" | "denied" | "expired" | "invalid" }) {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Fira Sans', Arial, Helvetica, sans-serif",
      padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <p style={{
          margin: "0 0 28px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#f97316",
        }}>
          SkillCat Labs
        </p>

        <div style={{
          backgroundColor: "#141414",
          border: "1px solid #262626",
          borderRadius: 12,
          padding: "36px 32px",
        }}>
          {state === "confirmed" && (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
              <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#fafafa" }}>
                Phone linked!
              </h1>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: "#a3a3a3", lineHeight: 1.6 }}>
                Your phone number is now connected to your SkillCat Logbook account. Text the SkillCat number anytime to log photos and notes.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#525252" }}>
                You can close this window.
              </p>
            </>
          )}

          {state === "denied" && (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>🔒</div>
              <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#fafafa" }}>
                Got it — we&apos;ve noted that.
              </h1>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: "#a3a3a3", lineHeight: 1.6 }}>
                We&apos;ve logged this as an unauthorized attempt and notified your administrator. No changes were made to your account.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#525252" }}>
                You can close this window.
              </p>
            </>
          )}

          {state === "expired" && (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⏱</div>
              <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#fafafa" }}>
                Link expired
              </h1>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: "#a3a3a3", lineHeight: 1.6 }}>
                This confirmation link has expired or was already used. Text your email address again to request a new one.
              </p>
            </>
          )}

          {state === "invalid" && (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
              <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#fafafa" }}>
                Invalid link
              </h1>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: "#a3a3a3", lineHeight: 1.6 }}>
                This link doesn&apos;t look right. Text your email address to the SkillCat number to get a new confirmation.
              </p>
            </>
          )}
        </div>

        <p style={{ margin: "24px 0 0", fontSize: 12, color: "#404040", textAlign: "center" }}>
          SkillCat Labs · Technician Logbook
        </p>
      </div>
    </div>
  );
}
