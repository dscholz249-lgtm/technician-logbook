/**
 * Marks a SkillCat Labs product as a beta, in the header.
 *
 * Deliberately identical across the Logbook, Assessments and Prehire
 * Assessments: these read as one family to a customer who sees two of them,
 * and three almost-matching badges would say the three teams were not talking
 * to each other.
 *
 * Not shown to a candidate mid-assessment. Someone part-way through a test
 * that decides whether they get hired does not need to be told the software
 * is unfinished — so the take flow has no badge, by decision rather than
 * oversight.
 */
export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-skillcat-orange/30 bg-skillcat-orange/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-skillcat-orange ${className}`}
    >
      In Beta
    </span>
  );
}
