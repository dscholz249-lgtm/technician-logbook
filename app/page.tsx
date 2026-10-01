import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveHomePath } from "@/lib/home-path";
import { InterestForm } from "./interest/interest-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Technician's Logbook · SkillCat Labs",
  description:
    "Assign training, capture job site photos, and keep technician records over SMS. No app for your field team. Request early access.",
};

const LOOM_VIDEO_ID = "ba5b0395f2044d4bac604951dcc83a64";

const FEATURES = [
  {
    title: "Assign training via SMS",
    description:
      "Directors and managers send training materials directly to technicians — no app, no login required.",
  },
  {
    title: "Capture job site photos",
    description:
      "Technicians text photos from the field and they're automatically logged to their profile.",
  },
  {
    title: "Track team progress",
    description:
      "Managers get a real-time dashboard showing completions, notes, and media — all in one place.",
  },
];

/**
 * The public landing page for logbook.skillcatlabs.com.
 *
 * This used to redirect to /dashboard or /auth/sign-in, which made the root of
 * a public domain useless to anyone who had not already been given an account.
 *
 * A signed-in visitor is not bounced away: the root stays the landing page for
 * everyone and the CTA changes instead, because a marketing page that
 * redirects its own team away cannot be checked by the people who own it.
 * resolveHomePath is shared with the auth callback so the button lands them
 * exactly where signing in would have.
 */
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only costs a roster lookup when there is a session — an anonymous visitor,
  // which is nearly all of them, skips it entirely.
  const home = user?.email ? await resolveHomePath(user.email) : null;

  const cta = home
    ? { href: home, label: "Open dashboard" }
    : { href: "/auth/sign-in", label: "Log in" };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-5xl space-y-10">

        {/* Top bar — the only nav this page has */}
        <div className="flex items-center justify-between gap-4">
          <img
            src="/images/skillcat-labs-logo.png"
            alt="SkillCat Labs"
            className="h-7 w-auto"
          />
          <Link
            href={cta.href}
            className="inline-flex items-center rounded-md border border-border px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {cta.label}
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-block rounded-full border border-skillcat-orange/30 bg-skillcat-orange/10 px-3 py-1 text-xs font-semibold text-skillcat-orange tracking-wide uppercase">
            Early access
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
            SMS-powered field team management
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            SkillCat helps field service companies assign training, capture job site media, and keep
            technician records — all via text message. No app needed for your team.
          </p>
        </div>

        {/* Videos */}
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 text-center">
            See it in action
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-border aspect-video">
                <iframe
                  src={`https://www.loom.com/embed/${LOOM_VIDEO_ID}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground font-medium">
                Manager experience
              </p>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                <video
                  src="/Tech-upload.mp4"
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground font-medium">
                Technician experience
              </p>
            </div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card px-5 py-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Request access form */}
        <div className="max-w-xl mx-auto w-full rounded-xl border border-border bg-card px-6 py-7 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Request access</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              We&apos;ll reach out when your account is ready.
            </p>
          </div>
          <InterestForm />
          {/* Someone who already has an account usually works this out here,
              at the form, rather than back at the top bar. */}
          {!home && (
            <p className="text-xs text-muted-foreground text-center">
              Already have access?{" "}
              <Link
                href="/auth/sign-in"
                className="text-foreground underline underline-offset-2 hover:text-skillcat-orange"
              >
                Log in
              </Link>
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50">
          Powered by <span className="text-muted-foreground">SkillCat</span>
        </p>

      </div>
    </main>
  );
}
