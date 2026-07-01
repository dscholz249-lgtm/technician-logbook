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
  // URL of the Express SMS server. Server-only — never expose to the client.
  get EXPRESS_API_URL() {
    return required("EXPRESS_API_URL");
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
