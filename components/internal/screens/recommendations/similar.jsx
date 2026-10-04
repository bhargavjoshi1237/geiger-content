"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ScanSearch } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent } from "@/lib/supabase/content";
import { similarContent } from "@/lib/supabase/recommend";
import { semanticSimilarity } from "@/lib/supabase/semantic";
import { useProject } from "@/context/project-context";
import { EMPTY_PANEL_CLASS } from "./constants";

// Similar Content: keyword-overlap ranking against a reference entry.
export function SimilarScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referenceId, setReferenceId] = useState("");
  const { projectId } = useProject();
  const [semantic, setSemantic] = useState(null);

  useEffect(() => {
    if (!projectId || !referenceId) return;
    let alive = true;
    semanticSimilarity(projectId, referenceId, 8).then(result => {
      if (alive) setSemantic({ projectId, referenceId, result });
    });
    return () => { alive = false; };
  }, [projectId, referenceId]);

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      setEntries(result ?? []);
      if (result && result.length > 0) setReferenceId(result[0].id);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const keywordRanked = useMemo(
    () => (referenceId ? similarContent(entries, referenceId, { limit: 8 }) : []),
    [entries, referenceId],
  );
  const semanticResult = semantic?.projectId === projectId && semantic?.referenceId === referenceId ? semantic.result : null;
  const ranked = semanticResult?.ok ? semanticResult.data.results : keywordRanked;
  const method = semanticResult?.ok ? "Semantic" : "Keywords";

  const reference = entries.find((e) => e.id === referenceId) || null;

  const stats = useMemo(() => [
    { label: "Candidates", value: String(Math.max(entries.length - 1, 0)), footer: "Ranked against the reference" },
    { label: "Top score", value: ranked.length ? ranked[0].score.toFixed(2) : "—", footer: method === "Semantic" ? "Cosine similarity and editorial rules" : "Overlap coefficient" },
    { label: "Method", value: method, footer: method === "Semantic" ? "Stored Gemini vectors" : "Keyword fallback" },
  ], [entries, ranked, method]);

  const columns = [
    {
      key: "entry", header: "Similar entry",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="line-clamp-2 font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
          <span className="text-xs text-text-secondary">{r.entry.type} · {r.entry.status}</span>
        </div>
      ),
    },
    {
      key: "score", header: "Score", align: "right",
      render: (r) => <span className="text-sm font-semibold tabular-nums text-foreground">{r.score.toFixed(2)}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Similar Content"
        description="Find related entries using stored semantic vectors, with a labelled keyword fallback."
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
      {semanticResult && !semanticResult.ok ? <p role="status" className="text-xs text-text-secondary">Keyword fallback: {semanticResult.error}</p> : null}
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : !reference ? (
        <EmptyState icon={ScanSearch} title="No entries yet" description="Publish content first — similarity needs something to compare." className={EMPTY_PANEL_CLASS} />
      ) : (
        <SectionCard
          bare
          title={`Similar to “${reference.title || reference.slug}”`}
          description={method === "Semantic" ? "Semantic similarity with editorial adjustments." : "Keyword overlap coefficients; semantic retrieval is unavailable."}
        >
          <DataTable
            columns={columns}
            data={ranked}
            getRowKey={(r) => r.entry.id}
            empty={<EmptyState icon={ScanSearch} title="Nothing similar" description="Add more entries with overlapping topics." />}
          />
        </SectionCard>
      )}
    </MainScreenWrapper>
  );
}

export default SimilarScreen;
