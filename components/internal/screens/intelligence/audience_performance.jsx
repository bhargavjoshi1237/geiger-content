"use client";
import { useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { DataTable, ScreenHeader, SectionCard, StatsBar } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { AUDIENCE_PERFORMANCE } from "./demo_data";
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
  Line,
  LineChart,
  Pie,
  PieChart,
  RANGE_OPTIONS,
  XAxis,
  YAxis,
} from "./charts";

export function AudiencePerformanceScreen() {
  const [range, setRange] = useState("30d");
  const d = AUDIENCE_PERFORMANCE;
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Audience Performance"
        description="Engagement and outcomes compared across reusable audience groups."
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
        <SectionCard title="Engaged users by persona" description="Weekly active engagement per core segment." className="lg:col-span-2">
          <ChartContainer
            config={{
              marketers: { label: "Marketers", color: CHART_COLORS[0] },
              developers: { label: "Developers", color: CHART_COLORS[1] },
              ecommerce: { label: "Ecommerce", color: CHART_COLORS[2] },
            }}
            className="h-[300px] w-full"
          >
            <LineChart data={d.trend} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="marketers" stroke="var(--color-marketers)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="developers" stroke="var(--color-developers)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="ecommerce" stroke="var(--color-ecommerce)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartContainer>
        </SectionCard>
        <SectionCard title="Journey mix" description="Where active profiles sit by stage.">
          <ChartContainer config={{ mix: { label: "Profiles" } }} className="h-[300px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={d.stages} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} strokeWidth={0}>
                {d.stages.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 grid gap-1.5">
            {d.stages.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-text-secondary">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {s.name}
                </span>
                <span className="font-medium text-foreground tabular-nums">{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Reach versus quality" description="Bigger bubbles convert better — size shows reach.">
        <ChartContainer
          config={{ engagement: { label: "Engagement %", color: CHART_COLORS[1] } }}
          className="h-[280px] w-full"
        >
          <BarChart data={d.segments} layout="vertical" margin={{ left: 24, right: 16 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="segment" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={110} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="engagement" radius={[0, 8, 8, 0]} maxBarSize={22}>
              {d.segments.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </SectionCard>
      <SectionCard title="Segment leaderboard" description="Activation opportunities by reusable group.">
        <DataTable
          columns={[
            { key: "segment", header: "Segment", render: (r) => <span className="font-medium text-foreground">{r.segment}</span> },
            { key: "profiles", header: "Profiles", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.profiles}</span> },
            { key: "engagement", header: "Engagement", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.engagement}</span> },
            { key: "conv", header: "Conv.", render: (r) => <span className="text-sm text-text-secondary tabular-nums">{r.conv}</span> },
            {
              key: "growth",
              header: "Growth",
              align: "right",
              render: (r) => (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" /> {r.growth}
                </span>
              ),
            },
          ]}
          data={d.rows}
          getRowKey={(r) => r.segment}
        />
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default AudiencePerformanceScreen;
