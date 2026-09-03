"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { DUPLICATE_DETECTION } from "./demo_data";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  CHART_COLORS,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  GRID_STROKE,
  Pie,
  PieChart,
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";

export function DuplicateDetectionScreen() {
  const [range, setRange] = useState("30d");
  const d = DUPLICATE_DETECTION;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Duplicate Detection"
        description="Overlapping content grouped by semantic similarity and merge impact."
        actions={
          <>
            <FilterDropdown value={range} onValueChange={setRange} options={RANGE_OPTIONS} height="h-9" />
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />
      <StatsBar stats={d.stats} />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Similarity buckets" description="Pairs grouped by cosine similarity score." className="lg:col-span-2">
          <ChartContainer config={{ count: { label: "Pairs", color: CHART_COLORS[2] } }} className="h-[300px] w-full">
            <BarChart data={d.buckets} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={52}>
                {d.buckets.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Corpus health" description="Share of unique versus overlapping content.">
          <ChartContainer config={{ health: { label: "Entries" } }} className="h-[300px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={d.outcome} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                {d.outcome.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 grid gap-1.5">
            {d.outcome.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-text-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-medium text-foreground tabular-nums">{c.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Similarity groups" description="Canonical suggestion and recommended action.">
        <DataTable
          columns={[
            { key: "group", header: "Group", render: (r) => <span className="font-medium text-foreground">{r.group}</span> },
            { key: "similarity", header: "Similarity", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.similarity}</span> },
            { key: "canonical", header: "Canonical", render: (r) => <span className="text-sm text-text-secondary">{r.canonical}</span> },
            { key: "action", header: "Action", align: "right", render: (r) => <Badge variant={r.action === "Merge" ? "neutral" : "outline"}>{r.action}</Badge> },
          ]}
          data={d.rows}
          getRowKey={(r) => r.group}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default DuplicateDetectionScreen;
