import { notFound } from "next/navigation";
import { getCompanyById } from "@/lib/supabase/db";
import { JoinTechForm } from "./join-tech-form";
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
    description: "Sign up to send job site photos and updates to your team by text — no app required.",
  };
}

export default async function JoinTechPage({ params }: Props) {
  const { companyId } = await params;
  const company = await getCompanyById(companyId).catch(() => null);
  if (!company) notFound();

  const loomVideoId = process.env.NEXT_PUBLIC_LOOM_VIDEO_ID;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-5xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-block rounded-full border border-skillcat-orange/30 bg-skillcat-orange/10 px-3 py-1 text-xs font-semibold text-skillcat-orange tracking-wide uppercase">
            Pilot Program
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
            Join {company.name} on SkillCat
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Send job site photos and updates straight from your phone — all via SMS, no app required.
          </p>
        </div>

        {/* Two-column layout: form left on mobile-top, video right on mobile-bottom */}
        <div className={`flex flex-col-reverse gap-6 ${loomVideoId ? "lg:flex-row lg:items-start" : "items-center"}`}>

          {/* Sign-up card */}
          <div className={`rounded-xl border border-border bg-card px-6 py-7 space-y-6 ${loomVideoId ? "w-full lg:w-[380px] lg:shrink-0" : "w-full max-w-md"}`}>
            <div>
              <h2 className="text-base font-semibold text-foreground">Create your account</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                You'll be added to <span className="font-medium text-foreground">{company.name}</span> immediately.
              </p>
            </div>
            <JoinTechForm companyId={companyId} companyName={company.name} />
          </div>

          {/* Loom video */}
          {loomVideoId && (
            <div className="w-full rounded-xl overflow-hidden border border-border aspect-video lg:flex-1">
              <iframe
                src={`https://www.loom.com/embed/${loomVideoId}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`}
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
