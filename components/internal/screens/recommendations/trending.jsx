"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import { EMPTY_PANEL_CLASS } from "./constants";

// Trending Content: recency-weighted proxy for trending; every score is labeled an estimate until metrics_daily exists.
export function TrendingScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      setEntries(result ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const trending = useMemo(() => {
    return [...entries]
      .map((e) => {
        const ts = e.updatedAt ? new Date(e.updatedAt).getTime() : 0;
        const ageDays = Math.max((now - ts) / 86400000, 0.1);
        return { entry: e, score: 1 / ageDays, ageDays };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [entries, now]);

  const stats = useMemo(() => [
    { label: "Candidates", value: String(entries.length), footer: "Ranked by recency" },
    { label: "Method", value: "Estimate", footer: "Recency proxy" },
    { label: "Measured traffic", value: "None", footer: "Needs metrics_daily" },
  ], [entries]);

  const columns = [
    {
      key: "entry", header: "Entry",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="line-clamp-2 font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
          <span className="text-xs text-text-secondary">{r.entry.status} · {r.ageDays < 1 ? "today (estimate)" : `${Math.round(r.ageDays)}d ago (estimate)`}</span>
        </div>
      ),
    },
    {
      key: "score", header: "Trend score", align: "right",
      render: (r) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span className="text-sm font-semibold tabular-nums text-foreground">{r.score.toFixed(2)}</span>
          <Badge variant="warning">est.</Badge>
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Trending Content" description="Freshest-first ranking — an estimate until real consumption metrics land." />
      <StatsBar stats={stats} columns={3} />
      <SectionCard title="Estimate, not measurement" description="True trending needs the Phase 5 events → metrics_daily pipeline. Until then this screen ranks by recency and labels every score as estimated.">
        <p className="text-sm text-text-secondary">Nothing here is presented as traffic.</p>
      </SectionCard>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={trending}
          getRowKey={(r) => r.entry.id}
          empty={<EmptyState icon={TrendingUp} title="No entries yet" description="Publish content to see trending estimates." className={EMPTY_PANEL_CLASS} />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default TrendingScreen;
