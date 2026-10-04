"use client";

import React, { useMemo, useState } from "react";
import { PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList,
  Line, LineChart, Pie, PieChart, Sector, XAxis, YAxis,
} from "recharts";
import { Card, CardContent } from "@geiger/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@geiger/ui/chart";
import { LogoLoading } from "@geiger/ui/logo-loading";
import {
  EditorSectionHeader, EmptyState, RollingNumber,
} from "@geiger/ui/screen-kit";
import { CONTENT_STATUSES, CONTENT_TYPES } from "../content/constants";
import { cn } from "@geiger/ui/lib/utils";
import FilterDropdown from "./filter_dropdown";

const DAY_MS = 86400000;
const WEEKS = 12;
const ACTIVITY_OPTIONS = [
  { value: "createdAt", label: "Entries created", description: "Entries created each week over the last 12 weeks." },
  { value: "updatedAt", label: "Entries by latest update", description: "Entries grouped by their latest update date, over the last 12 weeks." },
  { value: "publishedAt", label: "Entries published", description: "Entries by publication date over the last 12 weeks." },
];
const SERIES_COLORS = [1, 2, 3, 4, 5].map((index) => `var(--chart-${index})`);
const STATUS_ORDER = ["Published", "In review", "Draft", "Scheduled", "Archived"];

export function OverviewWidget({ title, description, action, children, className, contentClassName }) {
  return (
    <Card className={cn("h-full min-w-0 gap-0 rounded-xl border-border bg-surface-subtle py-0", className)}>
      <CardContent className="flex h-full min-w-0 flex-col gap-5 p-4 sm:p-5">
        <EditorSectionHeader
          title={title}
          description={description}
          action={action}

        />
        <div className={cn("min-h-0 min-w-0 flex-1", contentClassName)}>{children}</div>
      </CardContent>
    </Card>
  );
}

function PanelLoading({ label }) {
  return <div className="flex h-full min-h-48 items-center justify-center"><LogoLoading size={40} aria-label={label} /></div>;
}

function weekStarts(now) {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: WEEKS }, (_, index) => monday.getTime() - (WEEKS - 1 - index) * 7 * DAY_MS);
}

function chartCount(value) {
  return Number(value).toLocaleString("en-US");
}

export function ActivityWidget({ entries, asOf, loading }) {
  const [metric, setMetric] = useState("createdAt");
  const selected = ACTIVITY_OPTIONS.find((option) => option.value === metric);
  const data = useMemo(() => {
    if (!asOf) return [];
    return weekStarts(asOf).map((start) => ({
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: entries.filter((entry) => {
        const timestamp = Date.parse(entry[metric]);
        return timestamp >= start && timestamp < start + 7 * DAY_MS;
      }).length,
    }));
  }, [entries, metric, asOf]);
  const recent = data.slice(-5, -1).reduce((total, week) => total + week.value, 0);
  const previous = data.slice(-9, -5).reduce((total, week) => total + week.value, 0);
  const difference = previous ? Math.round(((recent - previous) / previous) * 100) : null;
  const hasData = data.some((week) => week.value > 0);

  return (
    <OverviewWidget
      title="Content activity"
      description={selected.description}
      action={<FilterDropdown value={metric} onValueChange={setMetric} options={ACTIVITY_OPTIONS} />}
      contentClassName="flex flex-col"
    >
      {loading ? <PanelLoading label="Loading activity" /> : !hasData ? (
        <EmptyState icon={TrendingUp} title="No activity yet" description="Weekly activity appears as entries are created, updated, and published." className="flex-1 py-8" />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <RollingNumber value={recent} className="text-3xl font-semibold tracking-tight" />
            <span className="text-xs text-muted-foreground">in the last 4 completed weeks</span>
            {difference !== null ? <span className="text-xs text-muted-foreground">{difference > 0 ? "+" : ""}{difference}% vs previous 4 completed weeks</span> : null}
          </div>
          <ChartContainer config={{ value: { label: selected.label, color: "var(--chart-1)" } }} className="min-h-[240px] min-w-0 w-full flex-1 aspect-auto">
            <LineChart accessibilityLayer data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2} dot={{ fill: "var(--color-value)", r: 3, stroke: "var(--background)", strokeWidth: 2 }} activeDot={{ r: 5 }}>
                <LabelList dataKey="value" position="top" offset={10} className="fill-foreground" fontSize={11} formatter={(value) => value > 0 ? chartCount(value) : ""} />
              </Line>
            </LineChart>
          </ChartContainer>
        </>
      )}
    </OverviewWidget>
  );
}

export function StatusMixWidget({ entries, loading }) {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const mix = useMemo(() => STATUS_ORDER.map((status, index) => ({
    key: status.toLowerCase().replaceAll(" ", ""),
    status,
    value: entries.filter((entry) => entry.status === status).length,
    fill: SERIES_COLORS[index],
  })), [entries]);
  const total = entries.length;
  const config = Object.fromEntries(mix.map((item) => [item.key, { label: item.status, color: item.fill }]));
  const selectedItem = mix.find((item) => item.key === selectedStatus) || mix.find((item) => item.value > 0) || mix[0];

  return (
    <OverviewWidget
      title="Status mix"
      description="Distribution across content statuses."
      action={!loading && total > 0 ? <FilterDropdown value={selectedItem.key} onValueChange={setSelectedStatus} options={mix.map((item) => ({ value: item.key, label: item.status }))} /> : null}
      contentClassName="flex flex-col"
    >
      {loading ? <PanelLoading label="Loading status mix" /> : !total ? (
        <EmptyState icon={PieChartIcon} title="No entries yet" description="Create content to see the status breakdown." className="flex-1 py-8" />
      ) : (
        <>
          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
            <ChartContainer config={config} className="mx-auto h-[220px] w-[220px] shrink-0 aspect-square">
              <PieChart accessibilityLayer>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="key" hideLabel />} />
                <Pie
                  data={mix.filter((item) => item.value > 0)}
                  dataKey="value"
                  nameKey="key"
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={78}
                  stroke="var(--background)"
                  strokeWidth={2}
                  shape={({ payload, key: sectorKey, ...sector }) => <Sector key={sectorKey} {...sector} outerRadius={payload.key === selectedItem.key ? 88 : 78} />}
                />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" aria-live="polite" aria-atomic="true">
              <span className="text-3xl font-bold leading-none text-foreground">{chartCount(selectedItem.value)}</span>
              <span className="mt-1 text-xs font-medium text-muted-foreground">{Math.round(selectedItem.value / total * 100)}% share</span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{chartCount(selectedItem.value)} of {chartCount(total)} entries</p>
        </>
      )}
    </OverviewWidget>
  );
}

function DistributionChart({ data, label }) {
  return (
    <ChartContainer config={{ value: { label: "Entries", color: "var(--chart-1)" } }} className="h-[220px] min-w-0 w-full aspect-auto">
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barSize={18}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={82} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name, item) => (
          <span className="flex items-center gap-3"><span className="text-muted-foreground">{item.payload.label}</span><span className="font-medium tabular-nums">{chartCount(value)} entries</span></span>
        )} />} />
        <Bar dataKey="value" name={label} fill="var(--color-value)" radius={[0, 4, 4, 0]}>
          {data.map((item, index) => <Cell key={item.label} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />)}
          <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} formatter={chartCount} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function PipelineWidget({ entries, loading }) {
  const data = CONTENT_STATUSES.filter((status) => status !== "Archived").map((status) => ({
    label: status,
    value: entries.filter((entry) => entry.status === status).length,
  }));
  const total = data.reduce((count, item) => count + item.value, 0);
  // Keep the workflow order; these are inventory counts, not funnel conversions.
  const ordered = ["Draft", "In review", "Scheduled", "Published"].map((status) => data.find((item) => item.label === status));
  return (
    <OverviewWidget title="Publishing stages" description={`${chartCount(total)} active entries, from draft to live.`}>
      {loading ? <PanelLoading label="Loading publishing stages" /> : !total ? <EmptyState title="No active entries" description="Draft, review, scheduled, and published entries appear here." className="py-8" /> : <DistributionChart data={ordered} label="Publishing stage" />}
    </OverviewWidget>
  );
}

export function TypeMixWidget({ entries, loading }) {
  const data = CONTENT_TYPES.map((type) => ({ label: type, value: entries.filter((entry) => entry.type === type).length })).sort((a, b) => b.value - a.value);
  return (
    <OverviewWidget title="Content types" description="Library size by type, ordered by volume.">
      {loading ? <PanelLoading label="Loading content types" /> : !entries.length ? <EmptyState title="No content types in use" description="Create entries to compare their content types." className="py-8" /> : <DistributionChart data={data} label="Content type" />}
    </OverviewWidget>
  );
}
