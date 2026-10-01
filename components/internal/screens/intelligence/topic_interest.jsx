"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar, StatusPill } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  FALLBACK_TOPICS,
  buildTopics,
  useLiveAnalytics,
} from "./live_data";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  CHART_COLORS,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  GRID_STROKE,
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";

const STAGE_MAP = {
  Expanding: { label: "Expanding", variant: "success", dotClass: "bg-emerald-400" },
  Evaluating: { label: "Evaluating", variant: "info", dotClass: "bg-sky-400" },
  Learning: { label: "Learning", variant: "purple", dotClass: "bg-violet-300" },
  Dormant: { label: "Dormant", variant: "neutral", dotClass: "bg-[#737373]" },
  Negative: { label: "Negative", variant: "outline", dotClass: "bg-[#525252]" },
};

const DEFAULT_TOPIC_SERIES = [
  { key: "aiVideo", label: "AI video" },
  { key: "contentOS", label: "Content OS" },
  { key: "automation", label: "Automation" },
];

export function TopicInterestScreen() {
  const [range, setRange] = useState("30d");
  const { loading, live, metrics, events, entries } = useLiveAnalytics();
  const dataset = live ? buildTopics({ metrics, events, entries }) : null;
  const d = dataset ?? FALLBACK_TOPICS;
  const sample = !loading && !dataset;
  const series = d.trendSeries || DEFAULT_TOPIC_SERIES;
  const trendConfig = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: CHART_COLORS[i % CHART_COLORS.length] }]),
  );
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Topic Interest"
        description="Audience interest and maturity for each topic, plus emerging opportunities."
        actions={
          <>
            {sample ? <Badge variant="neutral">Sample data</Badge> : null}
            <FilterDropdown value={range} onValueChange={setRange} options={RANGE_OPTIONS} height="h-9" />
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />
      <StatsBar stats={d.stats} />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Interest momentum" description="Engaged profiles per flagship topic." className="lg:col-span-2">
          <ChartContainer
            config={trendConfig}
            className="h-[300px] w-full"
          >
            <AreaChart data={d.trend} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {series.map((s) => (
                <Area key={s.key} type="monotone" dataKey={s.key} stroke={`var(--color-${s.key})`} fill={`var(--color-${s.key})`} fillOpacity={0.16} strokeWidth={2} />
              ))}
            </AreaChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Maturity split" description="Users stacked by journey stage per topic.">
          <ChartContainer
            config={{
              discovered: { label: "Discovered", color: CHART_COLORS[0] },
              learning: { label: "Learning", color: CHART_COLORS[1] },
              evaluating: { label: "Evaluating", color: CHART_COLORS[3] },
              converted: { label: "Converted", color: CHART_COLORS[4] },
            }}
            className="h-[300px] w-full"
          >
            <BarChart data={d.stages} layout="vertical" margin={{ left: 24, right: 12 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="topic" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={110} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="discovered" stackId="a" fill="var(--color-discovered)" />
              <Bar dataKey="learning" stackId="a" fill="var(--color-learning)" />
              <Bar dataKey="evaluating" stackId="a" fill="var(--color-evaluating)" />
              <Bar dataKey="converted" stackId="a" fill="var(--color-converted)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        </SectionCard>
      </div>
      <SectionCard title="Topic leaderboard" description="Interest score, momentum, and coverage.">
        <DataTable
          columns={[
            { key: "topic", header: "Topic", render: (r) => <span className="font-medium text-foreground">{r.topic}</span> },
            { key: "interest", header: "Interest", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.interest}</span> },
            { key: "momentum", header: "Momentum", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.momentum}</span> },
            { key: "stage", header: "Stage", render: (r) => <StatusPill status={r.stage} map={STAGE_MAP} /> },
            { key: "content", header: "Pieces", align: "right", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.content}</span> },
          ]}
          data={d.rows}
          getRowKey={(r) => r.topic}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default TopicInterestScreen;
