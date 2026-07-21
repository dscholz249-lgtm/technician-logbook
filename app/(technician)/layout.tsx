import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTechnicianByEmail } from "@/lib/supabase/db";

export default async function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/sign-in");
  }

  const technician = await getTechnicianByEmail(user.email).catch(() => null);
  if (!technician) {
    redirect("/auth/sign-in?error=not_authorized");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <Link href="/tech">
          <img src="/images/skillcat-labs-logo.png" alt="SkillCat Labs" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
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
      <main className="flex-1 px-6 py-6 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
