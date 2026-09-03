"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { KNOWLEDGE_GRAPH } from "./demo_data";
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

const KIND_COLOR = {
  topic: "var(--chart-1)",
  content: "var(--chart-2)",
  segment: "var(--chart-3)",
  outcome: "var(--chart-4)",
};

export function KnowledgeGraphScreen() {
  const [range, setRange] = useState("30d");
  const d = KNOWLEDGE_GRAPH;
  const W = 100;
  const H = 100;
  const pos = (n) => ({ x: (n.x / 100) * W, y: (n.y / 100) * H });
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Knowledge Graph"
        description="Entities, connections, and evidence linking content, topics, and outcomes."
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
        <SectionCard title="Graph explorer" description="Live demo topology — topics bridge content to outcomes." className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-surface-card p-2">
            <svg viewBox="0 0 100 100" className="h-[340px] w-full">
              {d.edges.map(([a, b], i) => {
                const p1 = pos(d.nodes[a]);
                const p2 = pos(d.nodes[b]);
                return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--border-strong)" strokeWidth="0.4" opacity="0.8" />;
              })}
              {d.nodes.map((n) => {
                const p = pos(n);
                return (
                  <g key={n.id}>
                    <circle cx={p.x} cy={p.y} r={n.size / 7} fill={KIND_COLOR[n.kind] || "var(--chart-1)"} opacity="0.9" stroke="var(--background)" strokeWidth="0.6" />
                    <text x={p.x} y={p.y + n.size / 7 + 4} textAnchor="middle" fontSize="3" fill="var(--foreground)">
                      {n.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(KIND_COLOR).map(([k, c]) => (
              <Badge key={k} variant="neutral">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                {k}
              </Badge>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Entity mix" description="What the graph is built from.">
          <ChartContainer config={{ count: { label: "Entities", color: CHART_COLORS[0] } }} className="h-[340px] w-full">
            <BarChart data={d.entities} layout="vertical" margin={{ left: 24, right: 12 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="type" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={95} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={22}>
                {d.entities.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </SectionCard>
      </div>
      <SectionCard title="Strongest relations" description="Evidence-backed edges powering recommendations.">
        <DataTable
          columns={[
            { key: "from", header: "From", render: (r) => <span className="font-medium text-foreground">{r.from}</span> },
            { key: "relation", header: "Relation", render: (r) => <Badge variant="neutral">{r.relation}</Badge> },
            { key: "to", header: "To", render: (r) => <span className="text-sm text-text-secondary">{r.to}</span> },
            { key: "strength", header: "Strength", align: "right", render: (r) => <span className="text-sm font-semibold text-foreground tabular-nums">{r.strength}</span> },
          ]}
          data={d.rows}
          getRowKey={(r, i) => `${r.from}-${r.to}-${i}`}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default KnowledgeGraphScreen;
