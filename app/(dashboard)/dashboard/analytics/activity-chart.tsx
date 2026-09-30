"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { ActivityPoint } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Period = "daily" | "monthly" | "annually" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "monthly", label: "Monthly" },
  { key: "annually", label: "Annually" },
  { key: "all", label: "All time" },
];

/**
 * Categorical hues in fixed order — a series keeps its color no matter how
 * many are showing. Orange is the SkillCat brand hue already used across the
 * dashboard; the green is one step darker than the #10B981 the other charts
 * use because that step sits above the lightness band on a dark surface.
 * Validated for lightness, chroma, CVD separation and contrast against the
 * dark card surface (oklch(0.205 0 0)).
 */
const SERIES = [
  { key: "images", label: "Images", color: "#F05523" },
  { key: "curriculum", label: "Curriculum lookups", color: "#3B82F6" },
  { key: "other", label: "Other requests", color: "#0E9F6E" },
] as const;

// The card surface. Used as the gap between stacked segments so they read as
// separate blocks rather than one bar with a color change.
const SURFACE = "#343434";

// A daily view of a pilot that has been running for months is unreadable long
// before it is wrong. Coarser periods carry the full history.
const DAILY_WINDOW = 90;

/** Bucket key for a 'YYYY-MM-DD' date at the given period. */
function bucketOf(date: string, period: Period): string {
  if (period === "monthly") return date.slice(0, 7);
  if (period === "annually") return date.slice(0, 4);
  if (period === "all") return "All time";
  return date;
}

function labelOf(bucket: string, period: Period): string {
  if (period === "daily") return bucket.slice(5); // MM-DD
  if (period === "monthly") {
    const [y, m] = bucket.split("-");
    return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m) - 1]} ${y.slice(2)}`;
  }
  return bucket;
}

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const [period, setPeriod] = useState<Period>("daily");
  const [showTable, setShowTable] = useState(false);

  const rows = useMemo(() => {
    const source =
      period === "daily" ? data.slice(-DAILY_WINDOW) : data;

    const buckets = new Map<string, ActivityPoint>();
    for (const point of source) {
      const key = bucketOf(point.date, period);
      const acc = buckets.get(key);
      if (acc) {
        acc.images += point.images;
        acc.curriculum += point.curriculum;
        acc.other += point.other;
      } else {
        buckets.set(key, { ...point, date: key });
      }
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [data, period]);

  const chartData = {
    labels: rows.map((r) => labelOf(r.date, period)),
    datasets: SERIES.map((s) => ({
      label: s.label,
      data: rows.map((r) => r[s.key]),
      backgroundColor: s.color,
      // A 2px surface-colored border is the gap between stacked segments.
      borderColor: SURFACE,
      borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
      borderRadius: 3,
      borderSkipped: false as const,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Stacked bars are read a period at a time, so the tooltip shows all three
    // categories and their total rather than whichever segment the cursor hit.
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#A8A8A8", boxWidth: 12, usePointStyle: true, pointStyle: "rect" as const },
      },
      tooltip: {
        callbacks: {
          footer: (items: TooltipItem<"bar">[]) =>
            `Total ${items.reduce((s, i) => s + (i.parsed.y ?? 0), 0)}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: "#555", font: { size: 11 }, autoSkip: true, maxRotation: 0 },
        grid: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: "#555", font: { size: 11 }, precision: 0 },
        grid: { color: "#242424" },
      },
    },
  };

  const totals = SERIES.map((s) => ({
    ...s,
    total: rows.reduce((sum, r) => sum + r[s.key], 0),
  }));

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium">Requests through the system</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {period === "daily"
              ? `Images, curriculum lookups and other requests — last ${DAILY_WINDOW} days`
              : "Images, curriculum lookups and other requests"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                period === p.key
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">
          No activity recorded yet
        </div>
      ) : (
        <>
          <div className="h-72">
            <Bar data={chartData} options={options} />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
            <div className="flex gap-5">
              {totals.map((t) => (
                <div key={t.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 rounded-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-xs text-muted-foreground">{t.label}</span>
                  <span className="text-xs font-medium tabular-nums">{t.total}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {showTable ? "Hide data" : "Show data"}
            </button>
          </div>

          {showTable && (
            <div className="max-h-64 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Requests through the system by period and category
                </caption>
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th scope="col" className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Period</th>
                    {SERIES.map((s) => (
                      <th key={s.key} scope="col" className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
                        {s.label}
                      </th>
                    ))}
                    <th scope="col" className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.date}>
                      <th scope="row" className="text-left px-3 py-1.5 font-normal">{r.date}</th>
                      {SERIES.map((s) => (
                        <td key={s.key} className="text-right px-3 py-1.5 tabular-nums">{r[s.key]}</td>
                      ))}
                      <td className="text-right px-3 py-1.5 tabular-nums font-medium">
                        {r.images + r.curriculum + r.other}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
