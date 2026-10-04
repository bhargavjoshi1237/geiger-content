"use client";
import { useState } from "react";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { useInsights, similarityLabel } from "./insights_data";
import { InsightsScreen, InsightsTable } from "./insights_screen";

const THRESHOLD_OPTIONS = ["0.65", "0.75", "0.85", "0.95"].map((v) => ({ value: v, label: `Similarity ≥ ${Math.round(Number(v) * 100)}%` }));

export function AiTagSuggestionsScreen() {
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("0.65");
  const [offset, setOffset] = useState(0);
  const state = useInsights("tags", { offset });
  const rows = (state.data?.rows || []).filter((r) => r.score >= Number(threshold) && `${r.content} ${r.tag} ${r.taxonomy}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="AI Tag Suggestions" description="Taxonomy terms supported by similar indexed neighbours, without generation requests." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle={state.data?.scanned ? "No new tag suggestions in this scan" : "No indexed published sources yet"} emptyDescription="Index published entries with taxonomy assignments. Suggestions appear when a similar neighbour has a term the source does not have."
    controls={<FilterDropdown value={threshold} onValueChange={setThreshold} options={THRESHOLD_OPTIONS} />}
    stats={(d) => [{ label: "Suggestions", value: String(d.rows.length), footer: "Missing taxonomy assignments" }, { label: "Sources scanned", value: String(d.scanned), footer: "Current index page" }, { label: "Provider requests", value: "0", footer: "Uses stored vectors only" }]}
    onPrevious={offset ? () => setOffset(Math.max(0, offset - 100)) : null} onNext={state.data?.nextOffset != null ? () => setOffset(state.data.nextOffset) : null}>
    <InsightsTable title="Suggested terms" description="Review neighbour evidence and apply suitable terms in the entry editor. Similarity is not a calibrated probability." columns={[
      { key: "content", header: "Content", render: (r) => <span className="block max-w-[16rem] truncate font-medium text-foreground" title={r.content}>{r.content}</span> },
      { key: "tag", header: "Suggested term", render: (r) => <Badge variant="info">{r.tag}</Badge> },
      { key: "taxonomy", header: "Taxonomy", render: (r) => <span className="whitespace-nowrap text-sm text-text-secondary">{r.taxonomy}</span> },
      { key: "score", header: "Similarity", align: "right", render: (r) => <span className="text-sm tabular-nums text-text-secondary">{similarityLabel(r.score)}</span> },
      { key: "evidence", header: "Evidence", render: (r) => <span className="line-clamp-2 min-w-[12rem] text-xs text-text-secondary">{r.evidence.map((e) => e.title).join(", ")}</span> },
    ]} data={rows} getRowKey={(r) => r.id} />
  </InsightsScreen>;
}
export default AiTagSuggestionsScreen;
