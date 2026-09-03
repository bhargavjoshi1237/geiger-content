"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { FUNNELS_JOURNEYS } from "./demo_data";
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
  Funnel,
  FunnelChart,
  GRID_STROKE,
  LabelList,
  Line,
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";

export function FunnelsJourneysScreen() {
  const [range, setRange] = useState("30d");
  const d = FUNNELS_JOURNEYS;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Funnels & Journeys"
        description="Stage transitions, drop-offs, time to convert, and winning content paths."
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
        <SectionCard title="Acquisition funnel" description="Visit to outcome across the flagship journey." className="lg:col-span-2">
          <ChartContainer config={{ value: { label: "Users", color: CHART_COLORS[0] } }} className="h-[320px] w-full">
            <FunnelChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Funnel dataKey="value" data={d.funnel} isAnimationActive>
                <LabelList position="right" fill="var(--foreground)" stroke="none" fontSize={11} dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap gap-2">
            {d.funnel.map((s) => (
              <Badge key={s.name} variant="neutral">
                {s.name} · {s.value.toLocaleString()}
              </Badge>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Drop-off signals" description="Largest relative loss sits between steps 2 and 3.">
          <div className="grid gap-3">
            {[
              { s: "Engaged → Solution", v: "44% continue", w: "56%", c: CHART_COLORS[2] },
              { s: "Solution → Trial", v: "46% continue", w: "46%", c: CHART_COLORS[3] },
              { s: "Trial → Converted", v: "52% continue", w: "52%", c: CHART_COLORS[1] },
            ].map((r) => (
              <div key={r.s} className="rounded-xl border border-border bg-surface-card p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{r.s}</span>
                  <span className="text-text-secondary tabular-nums">{r.v}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-strong">
                  <div className="h-full rounded-full" style={{ width: r.w, background: r.c }} />
                </div>
              </div>
            ))}
            <p className="text-xs leading-5 text-text-secondary">Recommendation: add a comparison block and social proof on solution pages to lift step-3 throughput.</p>
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Entries versus conversions" description="Weekly funnel throughput and outcome volume.">
        <ChartContainer
          config={{ entered: { label: "Entered", color: CHART_COLORS[0] }, converted: { label: "Converted", color: CHART_COLORS[1] } }}
          className="h-[280px] w-full"
        >
          <ComposedChart data={d.weekly} margin={{ left: -12, right: 8 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="entered" fill="var(--color-entered)" radius={[8, 8, 0, 0]} maxBarSize={42} />
            <Line type="monotone" dataKey="converted" stroke="var(--color-converted)" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ChartContainer>
      </SectionCard>
      <SectionCard title="Top paths" description="Content sequences that most reliably lead to outcomes.">
        <DataTable
          columns={[
            { key: "path", header: "Path", render: (r) => <span className="font-medium text-foreground">{r.path}</span> },
            { key: "users", header: "Users", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.users}</span> },
            { key: "conv", header: "Conv.", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.conv}</span> },
            { key: "time", header: "Avg. time", align: "right", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.time}</span> },
          ]}
          data={d.paths}
          getRowKey={(r) => r.path}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default FunnelsJourneysScreen;
