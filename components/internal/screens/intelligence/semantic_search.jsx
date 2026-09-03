"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar, StatusPill } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { SEMANTIC_SEARCH } from "./demo_data";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  CHART_COLORS,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ComposedChart,
  GRID_STROKE,
  Line,
  Pie,
  PieChart,
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";

const ACTION_MAP = {
  Covered: { label: "Covered", variant: "success", dotClass: "bg-emerald-400" },
  Improve: { label: "Improve", variant: "info", dotClass: "bg-sky-400" },
  Gap: { label: "Gap", variant: "purple", dotClass: "bg-violet-300" },
};

export function SemanticSearchScreen() {
  const [range, setRange] = useState("30d");
  const d = SEMANTIC_SEARCH;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Semantic Search"
        description="What people ask for in meaning-based search, and how well content answers."
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
        <SectionCard title="Query volume" description="Searches versus zero-result searches." className="lg:col-span-2">
          <ChartContainer
            config={{ queries: { label: "Queries", color: CHART_COLORS[0] }, noResult: { label: "No result", color: CHART_COLORS[4] } }}
            className="h-[300px] w-full"
          >
            <ComposedChart data={d.volume} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="queries" fill="var(--color-queries)" radius={[8, 8, 0, 0]} maxBarSize={44} />
              <Line type="monotone" dataKey="noResult" stroke="var(--color-noResult)" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Intent split" description="Why people search right now.">
          <ChartContainer config={{ intent: { label: "Queries" } }} className="h-[300px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={d.intents} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                {d.intents.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 grid gap-1.5">
            {d.intents.map((c, i) => (
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
      <SectionCard title="Top queries" description="Relevance, click-through, and coverage action.">
        <DataTable
          columns={[
            { key: "query", header: "Query", render: (r) => <span className="font-medium text-foreground">{r.query}</span> },
            { key: "count", header: "Volume", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.count}</span> },
            { key: "ctr", header: "CTR", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.ctr}</span> },
            { key: "noResult", header: "No-result", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.noResult}</span> },
            { key: "action", header: "Action", align: "right", render: (r) => <StatusPill status={r.action} map={ACTION_MAP} /> },
          ]}
          data={d.rows}
          getRowKey={(r) => r.query}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default SemanticSearchScreen;
