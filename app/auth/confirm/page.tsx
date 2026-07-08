"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ConfirmPage() {
  useEffect(() => {
    async function exchange() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      // Try auto-detected session first
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        window.location.replace("/auth/callback?confirmed=1");
        return;
      }

      // Explicit hash parsing — @supabase/ssr browser client does not auto-parse hashes.
      const hash = window.location.hash.slice(1);
      if (hash) {
        const params = new URLSearchParams(hash);

        const errorDesc = params.get("error_description") || params.get("error");
        if (errorDesc) {
          window.location.replace(`/auth/sign-in?error=${encodeURIComponent(errorDesc)}`);
          return;
        }

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) {
            window.location.replace("/auth/callback?confirmed=1");
            return;
          }
          window.location.replace(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      window.location.replace("/auth/sign-in?error=missing_token");
    }

    exchange();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
      <p className="text-sm text-zinc-400">Signing you in…</p>
    </main>
  );
}
