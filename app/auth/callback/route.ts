import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail, getTechnicianByEmail } from "@/lib/supabase/db";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = env.PUBLIC_ORIGIN;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const confirmed = searchParams.get("confirmed");
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(errorParam)}`,
    );
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`,
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`,
      );
    }
  } else if (!confirmed) {
    // No recognised params — unexpected state
    return NextResponse.redirect(`${origin}/auth/sign-in?error=missing_token`);
  }
  // confirmed=1: session already written to cookies by /auth/confirm HashExchange

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(`${origin}/auth/sign-in?error=no_user`);
  }

  const isAdmin = env.ADMIN_EMAILS.includes(user.email.toLowerCase());
  if (isAdmin) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  const manager = await getManagerByEmail(user.email).catch(() => null);
  if (manager) {
    return NextResponse.redirect(`${origin}/manager`);
  }

  const technician = await getTechnicianByEmail(user.email).catch(() => null);
  if (technician) {
    return NextResponse.redirect(`${origin}/tech`);
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/auth/sign-in?error=not_authorized`);
}
