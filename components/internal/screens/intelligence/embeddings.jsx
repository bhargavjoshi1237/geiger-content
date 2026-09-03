"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar, StatusPill } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { EMBEDDINGS } from "./demo_data";
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
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "./charts";

const STATUS_MAP = {
  Healthy: { label: "Healthy", variant: "success", dotClass: "bg-emerald-400" },
  Refreshing: { label: "Refreshing", variant: "info", dotClass: "bg-sky-400" },
  Stale: { label: "Stale", variant: "neutral", dotClass: "bg-[#737373]" },
};

export function EmbeddingsScreen() {
  const [range, setRange] = useState("30d");
  const d = EMBEDDINGS;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Embeddings"
        description="Semantic vectors powering search, similarity, and recommendations."
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
        <SectionCard title="Semantic map" description="Content clustered by meaning — bubble size shows views." className="lg:col-span-2">
          <ChartContainer config={{ topic: { label: "Vectors", color: CHART_COLORS[0] } }} className="h-[320px] w-full">
            <ScatterChart margin={{ left: -8, right: 12, top: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} name="Dimension 1" />
              <YAxis type="number" dataKey="y" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} name="Dimension 2" />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Scatter data={d.scatter} fill="var(--chart-1)" />
            </ScatterChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Model versions" description="Quality versus latency trade-off.">
          <div className="grid gap-3">
            {d.models.map((m, i) => (
              <div key={m.model} className="rounded-xl border border-border bg-surface-card p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {m.model}
                  </span>
                  <span className="text-xs text-text-secondary tabular-nums">{m.vectors.toLocaleString()} vectors</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
                  <span>Quality {m.quality}</span>
                  <span className="tabular-nums">{m.latency}ms</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-strong">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(m.quality * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Coverage by scope" description="Refresh health for every content scope.">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartContainer config={{ quality: { label: "Quality", color: CHART_COLORS[1] } }} className="h-[240px] w-full">
              <BarChart data={d.rows} layout="vertical" margin={{ left: 16, right: 12 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0.7, 1]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="scope" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={90} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quality" radius={[0, 8, 8, 0]} maxBarSize={22}>
                  {d.rows.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
          <DataTable
            columns={[
              { key: "scope", header: "Scope", render: (r) => <span className="font-medium text-foreground">{r.scope}</span> },
              { key: "coverage", header: "Coverage", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.coverage}</span> },
              { key: "status", header: "Status", align: "right", render: (r) => <StatusPill status={r.status} map={STATUS_MAP} /> },
            ]}
            data={d.rows}
            getRowKey={(r) => r.scope}
          />
        </div>
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default EmbeddingsScreen;
