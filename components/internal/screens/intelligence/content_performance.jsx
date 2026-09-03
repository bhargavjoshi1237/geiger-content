"use client";
import { useState } from "react";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { CONTENT_PERFORMANCE } from "./demo_data";
import {
  Area,
  AreaChart,
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

export function ContentPerformanceScreen() {
  const [range, setRange] = useState("30d");
  const d = CONTENT_PERFORMANCE;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Content Performance"
        description="Reach, engagement, conversion, and retention for every entry and collection."
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
            className="h-[300px] w-full"
          >
            <AreaChart data={d.trend} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="views" stroke="var(--color-views)" fill="var(--color-views)" fillOpacity={0.18} strokeWidth={2} />
              <Area type="monotone" dataKey="engaged" stroke="var(--color-engaged)" fill="var(--color-engaged)" fillOpacity={0.14} strokeWidth={2} />
              <Area type="monotone" dataKey="conversions" stroke="var(--color-conversions)" fill="var(--color-conversions)" fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Channel mix" description="Where engaged views originate.">
          <ChartContainer config={{ share: { label: "Views" } }} className="h-[300px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={d.channels} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                {d.channels.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 grid gap-1.5">
            {d.channels.map((c, i) => (
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
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Performance by type" description="Volume versus engagement quality." className="lg:col-span-2">
          <ChartContainer
            config={{ views: { label: "Views", color: CHART_COLORS[0] }, engagement: { label: "Engagement %", color: CHART_COLORS[2] } }}
            className="h-[280px] w-full"
          >
            <BarChart data={d.byType} margin={{ left: -8, right: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="type" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="views" fill="var(--color-views)" radius={[8, 8, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Underperforming" description="Needs editorial attention.">
          <div className="grid gap-3">
            {[
              { t: "Changelog — March", m: "44% engagement · high bounce" },
              { t: "Legacy import doc", m: "31% engagement · stale 45d" },
              { t: "Campaign templates", m: "-6% views week over week" },
            ].map((r) => (
              <div key={r.t} className="rounded-xl border border-border bg-surface-card p-3">
                <p className="text-sm font-medium text-foreground">{r.t}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{r.m}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Top content" description="Highest reach and outcome contribution.">
        <DataTable
          columns={[
            { key: "title", header: "Entry", render: (r) => <span className="font-medium text-foreground">{r.title}</span> },
            { key: "type", header: "Type", render: (r) => <Badge variant="neutral">{r.type}</Badge> },
            { key: "views", header: "Views", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.views}</span> },
            { key: "rate", header: "Eng. rate", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.rate}</span> },
            { key: "conv", header: "Conv.", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.conv}</span> },
            {
              key: "trend",
              header: "Trend",
              align: "right",
              render: (r) => (
                <span className={r.trend === "up" ? "inline-flex items-center gap-1 text-xs font-medium text-emerald-400" : "inline-flex items-center gap-1 text-xs font-medium text-red-400"}>
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
    </MainScreenWrapper>
  );
}
export default ContentPerformanceScreen;
