import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail } from "@/lib/supabase/db";
import { env } from "@/lib/env";
import { HashExchange } from "./hash-exchange";

export const dynamic = "force-dynamic";

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const errorParam = params.error_description || params.error;

  if (errorParam) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(errorParam)}`);
  }

  const { code, token_hash, type, confirmed } = params;

  // No query params means the session tokens are in a hash fragment (implicit flow).
  // Render a client component that can read window.location.hash and complete auth.
  if (!confirmed && !code && !token_hash) {
    return <HashExchange />;
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
      token_hash,
    });
    if (error) redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  }
  // confirmed=1: session already in cookies from HashExchange — fall through to role routing

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect(`/auth/sign-in?error=no_user`);

  const isAdmin = env.ADMIN_EMAILS.includes(user!.email!.toLowerCase());
  if (isAdmin) redirect(`/dashboard`);

  const manager = await getManagerByEmail(user!.email!).catch(() => null);
  if (manager) redirect(`/manager`);

  await supabase.auth.signOut();
  redirect(`/auth/sign-in?error=not_authorized`);
}
