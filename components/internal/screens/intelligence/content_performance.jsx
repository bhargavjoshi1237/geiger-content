"use client";
import { cn } from "@geiger/ui/lib/utils";
import { useState } from "react";
import { AlertTriangle, Download, TrendingDown, TrendingUp } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@geiger/ui/screen-kit";
import { LoadingArea } from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  FALLBACK_CONTENT,
  buildContentPerformance,
  useLiveAnalytics,
} from "./live_data";
import {
  Area,
  AreaChart,
  AXIS_PROPS,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  CHART_COLORS,
  CHART_HEIGHT,
  ChartValueLegend,
  GRID_STROKE,
  Pie,
  PieChart,
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@geiger/ui/chart";

export function ContentPerformanceScreen() {
  const [range, setRange] = useState("30d");
  const { loading, live, metrics, events, entries } = useLiveAnalytics();
  const dataset = live
    ? buildContentPerformance({ metrics, events, entries })
    : null;
  const d = dataset ?? FALLBACK_CONTENT;
  const sample = !loading && !dataset;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Content Performance"
        description="Reach, engagement, conversion, and retention for every entry and collection."
        actions={
          <>
            {sample ? <Badge variant="warning">Sample data</Badge> : null}
            <FilterDropdown value={range} onValueChange={setRange} options={RANGE_OPTIONS} />
            <Button>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />
      {loading ? (
        <LoadingArea panel size={72} label="Loading content performance" />
      ) : (
        <>
          <StatsBar stats={d.stats} />
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="Traffic trend"
              description="Views, engaged sessions, and conversions over time."
              className="lg:col-span-2"
            >
              <ChartContainer
                config={{
                  views: { label: "Views", color: CHART_COLORS[0] },
                  engaged: { label: "Engaged", color: CHART_COLORS[1] },
                  conversions: { label: "Conversions", color: CHART_COLORS[3] },
                }}
                className={cn("min-w-0 max-w-full", CHART_HEIGHT.md)}
              >
                <AreaChart data={d.trend} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" {...AXIS_PROPS} minTickGap={16} />
                  <YAxis {...AXIS_PROPS} width={44} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area type="monotone" dataKey="views" stroke="var(--color-views)" fill="var(--color-views)" fillOpacity={0.18} strokeWidth={2} />
                  <Area type="monotone" dataKey="engaged" stroke="var(--color-engaged)" fill="var(--color-engaged)" fillOpacity={0.14} strokeWidth={2} />
                  <Area type="monotone" dataKey="conversions" stroke="var(--color-conversions)" fill="var(--color-conversions)" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </SectionCard>
            <SectionCard title="Channel mix" description="Where engaged views originate." >
              <ChartContainer config={{ value: { label: "Views" } }} className={cn("min-w-0 max-w-full", CHART_HEIGHT.sm)}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                  <Pie data={d.channels} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3} strokeWidth={0}>
                    {d.channels.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ChartValueLegend items={d.channels} />
            </SectionCard>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Performance by type" description="Volume versus engagement quality." className="lg:col-span-2">
              <ChartContainer
                config={{ views: { label: "Views", color: CHART_COLORS[0] }, engagement: { label: "Engagement %", color: CHART_COLORS[2] } }}
                className={cn("min-w-0 max-w-full", CHART_HEIGHT.sm)}
              >
                <BarChart data={d.byType} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="type" {...AXIS_PROPS} interval="preserveStartEnd" />
                  <YAxis {...AXIS_PROPS} width={44} />
                  <ChartTooltip content={<ChartTooltipContent/>} />
                  <Bar dataKey="views" fill="var(--color-views)" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ChartContainer>
            </SectionCard>
            <SectionCard title="Underperforming" description="Needs editorial attention." >
              <ul className="divide-y divide-border">
                {d.underperforming.map((r) => (
                  <li key={r.t} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground" title={r.t}>{r.t}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">{r.m}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
          <SectionCard bare title="Top content" description="Highest reach and outcome contribution." >
            <DataTable

              columns={[
                { key: "title", header: "Entry", render: (r) => <span className="block max-w-[18rem] truncate font-medium text-foreground" title={r.title}>{r.title}</span> },
                { key: "type", header: "Type", render: (r) => <Badge variant="neutral">{r.type}</Badge> },
                { key: "views", header: "Views", align: "right", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.views}</span> },
                { key: "rate", header: "Eng. rate", align: "right", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.rate}</span> },
                { key: "conv", header: "Conv.", align: "right", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.conv}</span> },
                {
                  key: "trend",
                  header: "Trend",
                  align: "right",
                  render: (r) => (
                    <span className={r.trend === "up" ? "inline-flex items-center gap-1 text-xs font-medium capitalize text-emerald-400" : "inline-flex items-center gap-1 text-xs font-medium capitalize text-red-400"}>
                      {r.trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {r.trend}
                    </span>
                  ),
                },
              ]}
              data={d.top}
              getRowKey={(r) => r.title}
            />
          </SectionCard>
        </>
      )}
    </MainScreenWrapper>
  );
}
export default ContentPerformanceScreen;
