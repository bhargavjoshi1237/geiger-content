"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileStack } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent } from "@/lib/supabase/content";
import { listRankingRules } from "@/lib/supabase/variants";
import { rank, similarContent } from "@/lib/supabase/recommend";
import { semanticSimilarity } from "@/lib/supabase/semantic";
import { useProject } from "@/context/project-context";
import { EMPTY_PANEL_CLASS } from "./constants";

// Content-based Ranking: similarity to a reference entry, re-ranked through editorial boosts and exclusions; boosted rows are flagged.
export function ContentRankScreen() {
  const [entries, setEntries] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referenceId, setReferenceId] = useState("");
  const { projectId } = useProject();
  const [semantic, setSemantic] = useState(null);

  useEffect(() => {
    if (!projectId || !referenceId) return;
    let alive = true;
    semanticSimilarity(projectId, referenceId, 20).then(result => {
      if (alive) setSemantic({ projectId, referenceId, result });
    });
    return () => { alive = false; };
  }, [projectId, referenceId]);

  useEffect(() => {
    let alive = true;
    Promise.all([listContent(projectId), listRankingRules(projectId)]).then(([e, r]) => {
      if (!alive) return;
      setEntries(e ?? []);
      setRules(r ?? []);
      if (e && e.length > 0) setReferenceId(e[0].id);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const keywordRanked = useMemo(
    () => (referenceId ? rank(similarContent(entries, referenceId, { limit: 10 }), rules) : []),
    [entries, rules, referenceId],
  );
  const semanticResult = semantic?.projectId === projectId && semantic?.referenceId === referenceId ? semantic.result : null;
  const ranked = semanticResult?.ok ? semanticResult.data.results.slice(0, 10) : keywordRanked;

  const reference = entries.find((e) => e.id === referenceId) || null;

  const stats = useMemo(() => [
    { label: "Ranked", value: String(ranked.length), footer: "After editorial rules" },
    { label: "Boosted", value: String(ranked.filter((r) => r.boosted).length), footer: "Editorial multipliers" },
    { label: "Excluded", value: String(rules.filter((r) => r.ruleType === "exclude" && r.status === "Active").length), footer: "Rules applied" },
  ], [ranked, rules]);

  const columns = [
    {
      key: "entry", header: "Entry",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="flex min-w-0 items-center gap-2">
            <span className="line-clamp-2 font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
            {r.boosted ? <Badge variant="info" className="shrink-0">Boosted</Badge> : null}
          </span>
          <span className="text-xs text-text-secondary">{r.entry.type} · {r.entry.status}</span>
        </div>
      ),
    },
    {
      key: "score", header: "Final score", align: "right",
      render: (r) => <span className="text-sm font-semibold tabular-nums text-foreground">{Number(r.score).toFixed(2)}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Content-based Ranking"
        description="Similarity plus the editor's hand — boosts and exclusions applied on top."
        actions={
          entries.length > 0 ? (
            <Select value={referenceId} onValueChange={setReferenceId}>
              <SelectTrigger className="w-full sm:w-64" aria-label="Reference entry"><SelectValue placeholder="Reference entry" /></SelectTrigger>
              <SelectContent>
                {entries.map((e) => <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null
        }
      />
      <StatsBar stats={stats} columns={3} />
      <p role="status" className="text-xs text-text-secondary">{semanticResult?.ok ? "Ranking uses semantic similarity and editorial rules." : `Keyword fallback${semanticResult?.error ? `: ${semanticResult.error}` : " while semantic candidates load."}`}</p>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : !reference ? (
        <EmptyState icon={FileStack} title="No entries yet" description="Publish content first." className={EMPTY_PANEL_CLASS} />
      ) : (
        <SectionCard bare title={`Ranked like “${reference.title || reference.slug}”`} description="Manage the editorial layer under Boosts & Exclusions." >
          <DataTable

            columns={columns}
            data={ranked}
            getRowKey={(r) => r.entry.id}
            empty={<EmptyState icon={FileStack} title="Nothing ranked" description="Every candidate was excluded, or there is only one entry." />}
          />
        </SectionCard>
      )}
    </MainScreenWrapper>
  );
}

export default ContentRankScreen;
