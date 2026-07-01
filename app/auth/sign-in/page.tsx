import SignInForm from "./form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="size-8 rounded-lg bg-gradient-to-b from-skillcat-orange-bright to-skillcat-orange" />
            <span className="font-semibold text-sm text-zinc-300">SkillCat</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Technician Logbook
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            We&apos;ll send you a magic link to sign in.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-700/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {decodeURIComponent(error)}
          </div>
        )}

        <SignInForm />
      </div>
    </main>
  );
}
