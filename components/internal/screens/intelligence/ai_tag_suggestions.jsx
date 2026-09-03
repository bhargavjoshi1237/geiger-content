"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar, StatusPill } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { AI_TAG_SUGGESTIONS } from "./demo_data";
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

const STATUS_MAP = {
  Accepted: { label: "Accepted", variant: "success", dotClass: "bg-emerald-400" },
  Edited: { label: "Edited", variant: "info", dotClass: "bg-sky-400" },
  Pending: { label: "Pending", variant: "neutral", dotClass: "bg-[#737373]" },
  Rejected: { label: "Rejected", variant: "outline", dotClass: "bg-[#525252]" },
};

export function AiTagSuggestionsScreen() {
  const [range, setRange] = useState("30d");
  const d = AI_TAG_SUGGESTIONS;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="AI Tag Suggestions"
        description="Machine-proposed taxonomy and metadata awaiting editorial approval."
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
        <SectionCard title="Confidence distribution" description="Higher buckets are safe for bulk approval." className="lg:col-span-2">
          <ChartContainer config={{ count: { label: "Suggestions", color: CHART_COLORS[1] } }} className="h-[300px] w-full">
            <BarChart data={d.confidence} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={52}>
                {d.confidence.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Review outcomes" description="What editors did with suggestions.">
          <ChartContainer config={{ outcome: { label: "Count" } }} className="h-[300px] w-full">
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
      <SectionCard title="Suggestion queue" description="Approve, edit, or reject with model evidence.">
        <DataTable
          columns={[
            { key: "content", header: "Content", render: (r) => <span className="font-medium text-foreground">{r.content}</span> },
            { key: "tag", header: "Proposed tag", render: (r) => <span className="text-sm text-text-secondary">#{r.tag}</span> },
            { key: "conf", header: "Confidence", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.conf}</span> },
            { key: "status", header: "Status", align: "right", render: (r) => <StatusPill status={r.status} map={STATUS_MAP} /> },
          ]}
          data={d.rows}
          getRowKey={(r) => `${r.content}-${r.tag}`}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default AiTagSuggestionsScreen;
