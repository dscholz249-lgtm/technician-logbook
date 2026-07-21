"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !env.ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
}

export interface ImpersonateCookie {
  email: string;
  name: string;
  role: string;
}

export async function startImpersonation(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = (formData.get("email") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const role = (formData.get("role") as string)?.trim();
  if (!email) throw new Error("email required");

  const jar = await cookies();
  jar.set("skillcat_impersonate", JSON.stringify({ email, name, role } satisfies ImpersonateCookie), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  redirect(role === "technician" ? "/tech" : "/manager");
}

export async function stopImpersonation(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !env.ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
  const jar = await cookies();
  jar.delete("skillcat_impersonate");
  redirect("/dashboard/managers");
}
