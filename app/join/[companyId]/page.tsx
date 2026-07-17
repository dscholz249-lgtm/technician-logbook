import { notFound } from "next/navigation";
import { getCompanyById } from "@/lib/supabase/db";
import { JoinForm } from "./join-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ companyId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companyId } = await params;
  const company = await getCompanyById(companyId).catch(() => null);
  return {
    title: company ? `Join ${company.name} · SkillCat` : "SkillCat",
    description: "Sign up to join the SkillCat pilot program and start managing your field team via SMS.",
  };
}

export default async function JoinPage({ params }: Props) {
  const { companyId } = await params;
  const company = await getCompanyById(companyId).catch(() => null);
  if (!company) notFound();

  const loomVideoId = process.env.NEXT_PUBLIC_LOOM_VIDEO_ID;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-block rounded-full border border-skillcat-orange/30 bg-skillcat-orange/10 px-3 py-1 text-xs font-semibold text-skillcat-orange tracking-wide uppercase">
            Pilot Program
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
            Join {company.name}<br />on SkillCat
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Manage training requests, log technician notes, and keep your team moving — all via SMS, no app required.
          </p>
        </div>

        {/* Loom video */}
        {loomVideoId && (
          <div className="rounded-xl overflow-hidden border border-border aspect-video">
            <iframe
              src={`https://www.loom.com/embed/${loomVideoId}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}

        {/* Sign-up card */}
        <div className="rounded-xl border border-border bg-card px-6 py-7 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Create your account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              You'll be added to <span className="font-medium text-foreground">{company.name}</span> immediately.
            </p>
          </div>
          <JoinForm companyId={companyId} companyName={company.name} />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50">
          Powered by <span className="text-muted-foreground">SkillCat</span>
        </p>

      </div>
    </main>
  );
}
