"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function HashExchange() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // createBrowserClient auto-parses hash fragments on init; getSession() triggers it.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Session is now stored in cookies — hard-navigate so the server can read it.
        window.location.replace("/auth/callback?confirmed=1");
      } else {
        window.location.replace("/auth/sign-in?error=missing_token");
      }
    });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
      <p className="text-sm text-zinc-400">Signing you in…</p>
    </main>
  );
}
