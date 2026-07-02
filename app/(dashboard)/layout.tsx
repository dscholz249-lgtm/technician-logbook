import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "./dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-gradient-to-b from-skillcat-orange-bright to-skillcat-orange shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground leading-none">SkillCat</p>
            <p className="text-xs font-semibold leading-tight">Technician Logbook</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          <Nav />
        </div>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <form action="/auth/sign-out" method="POST" className="mt-1">
            <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-8 py-6 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
