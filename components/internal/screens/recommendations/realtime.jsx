"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Zap } from "lucide-react";

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
import { Button } from "@geiger/ui/button";
import { listContent } from "@/lib/supabase/content";
import { listRankingRules } from "@/lib/supabase/variants";
import { rank, similarContent } from "@/lib/supabase/recommend";
import { useProject } from "@/context/project-context";
import { EMPTY_PANEL_CLASS } from "./constants";

// Real-time Ranking: session re-rank demo — simulated views boost their type instantly; nothing persists past reload.
export function RealtimeScreen() {
  const [entries, setEntries] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionViews, setSessionViews] = useState([]);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listContent(projectId), listRankingRules(projectId)]).then(([e, r]) => {
      if (!alive) return;
      setEntries(e ?? []);
      setRules(r ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const ranked = useMemo(() => {
    if (entries.length === 0) return [];
    const seed = entries[0];
    const base = similarContent(entries, seed.id, { limit: 20 }).map((r) => ({ ...r }));
    const typeBoost = {};
    for (const id of sessionViews) {
      const viewed = entries.find((e) => e.id === id);
      if (viewed) typeBoost[viewed.type] = (typeBoost[viewed.type] || 0) + 0.5;
    }
    const boosted = base.map((r) => ({ ...r, score: r.score + (typeBoost[r.entry.type] || 0) }));
    return rank(boosted, rules).slice(0, 8);
  }, [entries, rules, sessionViews]);

  const stats = useMemo(() => [
    { label: "Session views", value: String(sessionViews.length), footer: "This demo session" },
    { label: "Candidates", value: String(entries.length), footer: "Re-ranked live" },
    { label: "Persisted", value: "Nothing", footer: "Demo resets on reload" },
  ], [sessionViews, entries]);

  const view = (id) => setSessionViews((prev) => [...prev.slice(-9), id]);

  const columns = [
    {
      key: "entry", header: "Ranked now",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="flex min-w-0 items-center gap-2">
            <span className="line-clamp-2 font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
            {r.boosted ? <Badge variant="info" className="shrink-0">Boosted</Badge> : null}
          </span>
          <span className="text-xs text-text-secondary">{r.entry.type}</span>
        </div>
      ),
    },
    {
      key: "score", header: "Score", align: "right",
      render: (r) => <span className="text-sm font-semibold tabular-nums text-foreground">{Number(r.score).toFixed(2)}</span>,
    },
    {
      key: "view", header: "", align: "right", className: "text-right",
      render: (r) => <Button size="sm" variant="outline" className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground" onClick={() => view(r.entry.id)}>View</Button>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Real-time Ranking"
        description="Session-based re-ranking — click View on any row and watch the list adapt to this session."
        actions={sessionViews.length > 0 ? <Button variant="outline" className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground" onClick={() => setSessionViews([])}><RotateCcw className="h-4 w-4" /> Reset session</Button> : null}
      />
      <StatsBar stats={stats} columns={3} />
      <SectionCard title="How it works" description="Each simulated view boosts that content type by +0.5 for the rest of the session, on top of similarity and editorial rules. A demo of the real-time loop — session state only, nothing is stored.">
        <p className="text-sm text-text-secondary">Production real-time ranking will consume the Phase 5 event stream instead of clicks here.</p>
      </SectionCard>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={ranked}
          getRowKey={(r) => r.entry.id}
          empty={<EmptyState icon={Zap} title="No entries yet" description="Publish content to demo session ranking." className={EMPTY_PANEL_CLASS} />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default RealtimeScreen;
