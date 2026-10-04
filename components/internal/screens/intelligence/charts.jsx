"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const AXIS_TICK = { fontSize: 11 };
export const GRID_STROKE = "var(--border)";

// Shared axis props so every cartesian chart reads the same (ticks only, no axis lines).
export const AXIS_PROPS = { tickLine: false, axisLine: false, tick: AXIS_TICK, tickMargin: 6 };

// Responsive chart heights: shorter on phones, roomier from `sm` up.
export const CHART_HEIGHT = {
  sm: "h-[220px] w-full sm:h-[260px]",
  md: "h-[240px] w-full sm:h-[300px]",
  lg: "h-[260px] w-full sm:h-[320px]",
};

// Colour-keyed value list that sits under a pie/donut in place of a recharts legend.
export function ChartValueLegend({ items, colors = CHART_COLORS }) {
  return (
    <ul className="mt-3 grid gap-1.5">
      {items.map((item, i) => (
        <li key={item.name} className="flex min-w-0 items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-2 text-text-secondary">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="truncate">{item.name}</span>
          </span>
          <span className="shrink-0 font-medium tabular-nums text-foreground">{Number(item.value || 0).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
};
