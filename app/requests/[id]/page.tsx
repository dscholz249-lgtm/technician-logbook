import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getQueueItem } from "@/lib/api";
import { SLACK_LINK_ACTOR } from "@/lib/request-link";
import type { QueueItemDetail } from "@/lib/types";
import { resolveRequestAccess } from "./access";
import { LocalTime, RequestActions } from "./request-actions";

export const dynamic = "force-dynamic";

// Opened from the "Mark complete" link in Slack request notifications. Lives
// outside the (dashboard) group so a valid signed link works without a
// session; signed-in admins get the same page and act as themselves.
export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ exp?: string; sig?: string }>;
}) {
  const { id: rawId } = await params;
  const { exp, sig } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const access = await resolveRequestAccess(id, exp, sig);
  if (!access.ok) {
    const next = encodeURIComponent(`/requests/${id}`);
    redirect(
      access.link === "expired"
        ? `/auth/sign-in?next=${next}&reason=link-expired`
        : `/auth/sign-in?next=${next}`,
    );
  }

  const item = await getQueueItem(id);
  if (!item) notFound();

  const managerName = item.manager?.name ?? item.manager_phone;
  const by = (actor: string | null) =>
    !actor ? "" : actor === SLACK_LINK_ACTOR ? " via Slack link" : ` by ${actor}`;

  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <img src="/images/skillcat-labs-logo.png" alt="SkillCat Labs" className="h-7 w-auto" />

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <h1 className="text-base font-semibold">{TITLES[item.type] ?? "Request"}</h1>
            <span className="text-xs text-muted-foreground">
              <LocalTime ms={item.created_at} />
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 text-sm">
            {details(item).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 break-words">{value || "—"}</dd>
              </div>
            ))}
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">Manager</dt>
              <dd className="mt-0.5 break-words">
                {[managerName, item.manager?.company_name].filter(Boolean).join(" · ")}
              </dd>
            </div>
          </dl>

          <div className="px-5 py-4 border-t border-border space-y-3">
            {item.status === "actioned" ? (
              <p className="text-sm">
                <span className="font-medium text-emerald-500">Completed</span>
                <span className="text-muted-foreground">
                  {by(item.actioned_by)}
                  {item.actioned_at && <> · <LocalTime ms={item.actioned_at} /></>}
                </span>
              </p>
            ) : (
              <>
                {item.status === "ignored" && (
                  <p className="text-sm text-muted-foreground">
                    Ignored{by(item.actioned_by)}
                    {item.actioned_at && <> · <LocalTime ms={item.actioned_at} /></>}. You can
                    still mark it complete.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {`Mark complete texts ${managerName} to let them know it's done.`}
                  {access.viaLink && " You're not signed in, so this is recorded as completed via Slack link."}
                </p>
                <RequestActions id={id} exp={exp} sig={sig} status={item.status} />
              </>
            )}
          </div>
        </div>

        {!access.viaLink && (
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to dashboard
          </Link>
        )}
      </div>
    </main>
  );
}

const TITLES: Record<string, string> = {
  assign_training: "Training request",
  add_employee: "New employee request",
  human_review: "Request needs review",
};

function details(item: QueueItemDetail): [string, string | null][] {
  let p: Record<string, unknown> = {};
  try {
    p = JSON.parse(item.payload);
  } catch {}
  const s = (v: unknown) => (v == null || v === "" ? null : String(v));

  switch (item.type) {
    case "assign_training":
      return [
        ["Employee", s(p.employee_name)],
        ["Course", s(p.certification_name)],
      ];
    case "add_employee":
      return [
        ["Name", s(p.name)],
        ["Details", [p.email, p.title].filter(Boolean).join(" · ") || null],
      ];
    default:
      return [["Message", s(p.raw)]];
  }
}
