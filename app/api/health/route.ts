import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    EXPRESS_API_URL: !!process.env.EXPRESS_API_URL,
  };
  const missing = Object.keys(checks).filter(k => !checks[k as keyof typeof checks]);
  return NextResponse.json({ ok: missing.length === 0, checks, missing });
}
