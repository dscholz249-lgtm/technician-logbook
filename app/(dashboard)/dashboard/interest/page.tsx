import { getInterestRequests } from "@/lib/supabase/db";
import { InterestTable } from "./interest-table";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interest Requests · SkillCat Admin",
};

export default async function InterestRequestsPage() {
  const requests = await getInterestRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Interest Requests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Companies that have requested early access via the interest page.
        </p>
      </div>
      <InterestTable requests={requests} />
    </div>
  );
}
