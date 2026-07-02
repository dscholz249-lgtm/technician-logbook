import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagerByEmail } from "@/lib/supabase/db";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/sign-in");
  }

  const manager = await getManagerByEmail(user.email).catch(() => null);
  if (!manager) {
    redirect("/auth/sign-in?error=not_authorized");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-md bg-gradient-to-b from-skillcat-orange-bright to-skillcat-orange shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground leading-none">SkillCat</p>
            <p className="text-sm font-semibold leading-tight">Technician Logbook</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {user.email}
          </span>
          <form action="/auth/sign-out" method="POST">
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
