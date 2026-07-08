"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markActioned } from "@/lib/api";
import { capture } from "@/lib/analytics";

export async function actionQueueItem(
  id: number,
  note?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Not authenticated" };
  }

  try {
    await markActioned(id, user.email, note);
    await capture(user.email, "request_actioned", { item_id: id });
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}
