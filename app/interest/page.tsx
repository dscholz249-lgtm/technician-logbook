import type { Metadata } from "next";
import { InterestForm } from "./interest-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request Access · SkillCat",
  description:
    "Learn how SkillCat helps field service companies manage their teams via SMS — no app required. Request access to get started.",
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

export default function InterestPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-5xl space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <img
            src="/images/skillcat-labs-logo.png"
            alt="SkillCat Labs"
            className="h-8 w-auto mx-auto"
          />
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
              We'll reach out when your account is ready.
            </p>
          </div>
          <InterestForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50">
          Powered by <span className="text-muted-foreground">SkillCat</span>
        </p>

      </div>
    </main>
  );
}
