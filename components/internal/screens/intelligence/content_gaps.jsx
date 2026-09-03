"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { CONTENT_GAPS } from "./demo_data";
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
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";

export function ContentGapsScreen() {
  const [range, setRange] = useState("30d");
  const d = CONTENT_GAPS;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Content Gaps"
        description="Unmet demand from search, journeys, and performance — ranked by opportunity."
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
        <SectionCard title="Demand versus supply" description="Search and journey demand against live coverage." className="lg:col-span-2">
          <ChartContainer
            config={{ demand: { label: "Demand", color: CHART_COLORS[0] }, supply: { label: "Supply", color: CHART_COLORS[2] } }}
            className="h-[300px] w-full"
          >
            <BarChart data={d.demand} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="topic" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="demand" fill="var(--color-demand)" radius={[8, 8, 0, 0]} maxBarSize={30} />
              <Bar dataKey="supply" fill="var(--color-supply)" radius={[8, 8, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Opportunity score" description="Prioritized backlog for editorial planning.">
          <div className="grid gap-3">
            {d.opportunity.map((o, i) => (
              <div key={o.topic} className="rounded-xl border border-border bg-surface-card p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{o.topic}</span>
                  <Badge variant={o.score >= 80 ? "neutral" : "outline"}>{o.score}</Badge>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-strong">
                  <div className="h-full rounded-full" style={{ width: `${o.score}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Gap backlog" description="Demand evidence, current supply, and owner.">
        <DataTable
          columns={[
            { key: "gap", header: "Gap", render: (r) => <span className="font-medium text-foreground">{r.gap}</span> },
            { key: "demand", header: "Demand", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.demand}</span> },
            { key: "supply", header: "Supply", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.supply}</span> },
            { key: "score", header: "Score", render: (r) => <span className="text-sm font-semibold text-foreground tabular-nums">{r.score}</span> },
            { key: "owner", header: "Owner", align: "right", render: (r) => <Badge variant="neutral">{r.owner}</Badge> },
          ]}
          data={d.rows}
          getRowKey={(r) => r.gap}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default ContentGapsScreen;
