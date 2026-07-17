export const env = {
  get SUPABASE_URL() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get SUPABASE_ANON_KEY() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY;
  },
  // URL of the Express SMS server. Server-only — never expose to the client.
  get EXPRESS_API_URL() {
    return required("EXPRESS_API_URL");
  },
  // Shared secret for Express API authentication. Required in production.
  get EXPRESS_API_SECRET() {
    return required("EXPRESS_API_SECRET");
  },
  // Slack incoming webhook URL — optional, notifications silently skipped if absent.
  get SLACK_WEBHOOK_URL(): string | undefined {
    return process.env.SLACK_WEBHOOK_URL;
  },
  // Comma-separated list of emails allowed to access the admin dashboard.
  get ADMIN_EMAILS(): string[] {
    const raw = process.env.ADMIN_EMAILS || "";
    return raw.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  },
  // E.164 format, e.g. +12513135407 — used for the downloadable contact card.
  get SKILLCAT_SMS_PHONE(): string | undefined {
    return process.env.SKILLCAT_SMS_PHONE;
  },
  get PUBLIC_ORIGIN() {
    const raw =
      process.env.NEXT_PUBLIC_APP_ORIGIN ||
      (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : "http://localhost:3000");
    return raw.replace(/\/$/, "");
  },
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var: ${name}. Set it in .env.local for local dev, or in Railway env for production.`,
    );
  }
  return v;
}
