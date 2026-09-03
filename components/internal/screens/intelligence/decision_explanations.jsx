"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { DECISION_EXPLANATIONS } from "./demo_data";
import {
  CartesianGrid,
  Cell,
  CHART_COLORS,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  GRID_STROKE,
  Line,
  LineChart,
  Pie,
  PieChart,
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";

export function DecisionExplanationsScreen() {
  const [range, setRange] = useState("30d");
  const d = DECISION_EXPLANATIONS;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Decision Explanations"
        description="Why each personalized decision was served — rule path, signals, and latency."
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
        <SectionCard title="Decision mix" description="Which layer chose the served content." className="lg:col-span-2">
          <ChartContainer config={{ mix: { label: "Decisions" } }} className="h-[300px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={d.breakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3} strokeWidth={0}>
                {d.breakdown.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap gap-2">
            {d.breakdown.map((b, i) => (
              <Badge key={b.name} variant="neutral">
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {b.name} · {b.value.toLocaleString()}
              </Badge>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Decision latency" description="P50 versus P95 edge response time.">
          <ChartContainer
            config={{ p50: { label: "P50", color: CHART_COLORS[1] }, p95: { label: "P95", color: CHART_COLORS[4] } }}
            className="h-[300px] w-full"
          >
            <LineChart data={d.latency} margin={{ left: -12, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="p50" stroke="var(--color-p50)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="p95" stroke="var(--color-p95)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
            </LineChart>
          </ChartContainer>
        </SectionCard>
      </div>
      <SectionCard title="Recent traces" description="Request-level explanation for every edge decision.">
        <DataTable
          columns={[
            { key: "request", header: "Request", render: (r) => <span className="font-medium text-foreground">{r.request}</span> },
            { key: "decision", header: "Served", render: (r) => <Badge variant="neutral">{r.decision}</Badge> },
            { key: "reason", header: "Reason", render: (r) => <span className="text-sm text-text-secondary">{r.reason}</span> },
            { key: "conf", header: "Conf.", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.conf}</span> },
            { key: "time", header: "Time", align: "right", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.time}</span> },
          ]}
          data={d.rows}
          getRowKey={(r, i) => `${r.request}-${i}`}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default DecisionExplanationsScreen;
