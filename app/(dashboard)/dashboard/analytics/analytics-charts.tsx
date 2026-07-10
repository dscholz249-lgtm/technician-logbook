"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { GlobalAnalyticsData } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const TYPE_LABELS: Record<string, string> = {
  assign_training: "Assign training",
  add_employee:    "Add technician",
  log_note:        "Log note",
  human_review:    "Human review",
};

const PALETTE = ["#F05523", "#3B82F6", "#10B981", "#F59E0B"];

const CHART_OPTS_SHARED = {
  plugins: {
    legend: { position: "bottom" as const, labels: { color: "#A8A8A8", boxWidth: 12 } },
  },
};

export function AnalyticsCharts({ data }: { data: GlobalAnalyticsData }) {
  const { dau_trend, requests_by_type } = data;

  const barData = {
    labels: dau_trend.map(d => d.date.slice(5)),
    datasets: [{
      label: "Active users",
      data: dau_trend.map(d => d.unique_users),
      backgroundColor: "#F05523",
      borderRadius: 3,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    ...CHART_OPTS_SHARED,
    scales: {
      x: { ticks: { color: "#555", font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: "#555", font: { size: 11 }, precision: 0 }, grid: { color: "#242424" } },
    },
  };

  const donutData = {
    labels: requests_by_type.map(r => TYPE_LABELS[r.type] ?? r.type),
    datasets: [{
      data: requests_by_type.map(r => r.total),
      backgroundColor: PALETTE.slice(0, requests_by_type.length),
      borderWidth: 0,
    }],
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium mb-4">Daily active users — last 30 days</p>
        {dau_trend.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No activity yet</div>
        ) : (
          <Bar data={barData} options={barOptions} />
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium mb-4">Requests by type</p>
        {requests_by_type.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No requests yet</div>
        ) : (
          <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: true, ...CHART_OPTS_SHARED }} />
        )}
      </div>
    </div>
  );
}
